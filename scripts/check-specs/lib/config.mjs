/**
 * Which configuration file the checker reads, and what it says about the other.
 *
 * The plugin was renamed from openspec-flow to openspec-steward, and the config
 * file with it. A consumer that declared an inventory in `openspec-flow.json`
 * and upgraded without renaming the file must not lose its inventory check:
 * a deriver that silently stops running reads as "nothing drifted". So the
 * legacy file is still read when it is the only one, with a note asking for the
 * rename. With both present the current file wins and the legacy one is not
 * parsed — a half-edited leftover must not fail a run that never uses it.
 *
 * Notes are not findings. They are returned for the entry point to print on
 * stderr and never reach the exit code, so a consumer mid-migration stays
 * green. The fallback is removed at 1.0.
 *
 * Pure over file contents (`null` when a file is absent); `index.mjs` owns the
 * reads.
 */

export const CONFIG_FILE = 'openspec-steward.json';
export const LEGACY_CONFIG_FILE = 'openspec-flow.json';

function parseDerivers(text) {
  const parsed = JSON.parse(text);
  return parsed.derivers ?? {};
}

/**
 * `{ derivers, file, notes }` from the two candidate files' contents. `file` is
 * the name that was read, or `null`, so a finding can point at the right one.
 */
export function selectConfig({ current, legacy }) {
  if (current !== null) {
    const notes =
      legacy === null
        ? []
        : [
            `${LEGACY_CONFIG_FILE} ignored: ${CONFIG_FILE} is present and takes precedence; delete ${LEGACY_CONFIG_FILE}`,
          ];
    return { derivers: parseDerivers(current), file: CONFIG_FILE, notes };
  }

  if (legacy !== null) {
    return {
      derivers: parseDerivers(legacy),
      file: LEGACY_CONFIG_FILE,
      notes: [
        `${LEGACY_CONFIG_FILE} is deprecated: rename it to ${CONFIG_FILE}; the old name stops being read at 1.0`,
      ],
    };
  }

  return { derivers: {}, file: null, notes: [] };
}
