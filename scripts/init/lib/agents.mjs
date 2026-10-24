/**
 * The openspec-steward section init keeps in a consumer's root `AGENTS.md`.
 *
 * Agents other than Claude Code read `AGENTS.md` and never see this plugin's
 * skills, so this is where they learn the flow. The section is a pointer, not
 * prose: many `AGENTS.md` files are routers with a line cap (core-api's is 40).
 * It states the order, points at `openspec/config.yaml` for the artifact rules
 * rather than repeating them (two copies would drift apart), and links the
 * flow's own page from its heading for the rest.
 *
 * Merge on request is the flow's one gate, but not the repository's only one:
 * a repository that also gates apply, commit or archive keeps those gates, so
 * the section defers to its approval rules instead of calling merge the only
 * gate.
 *
 * The section sits between two HTML comments, so a later run can find it and
 * replace it after a plugin upgrade without touching the rest of the file. A
 * begin marker with no end marker is left for a human: guessing where the old
 * section ends could delete text that was never ours.
 */

export const BEGIN = '<!-- openspec-steward:begin -->';
export const END = '<!-- openspec-steward:end -->';

export const AGENTS_SECTION = `${BEGIN}
## [OpenSpec change flow](https://github.com/codecicada/openspec-steward/blob/master/docs/change-flow.md)

From \`/start-change\` to \`/stop-change\`: explore -> propose -> apply -> open PR
-> verified green -> archive -> verify the apply -> merge when a human asks.
Artifacts follow \`openspec/config.yaml\`; this repository's own approval rules also bind.
${END}`;

/**
 * `AGENTS.md`'s text with the current section in place, or `null` when the file
 * has a begin marker but no end marker after it. `text` is `null` when the file
 * is absent.
 */
export function applySection(text) {
  if (text === null) return `${AGENTS_SECTION}\n`;

  const begin = text.indexOf(BEGIN);
  if (begin === -1) {
    if (text === '') return `${AGENTS_SECTION}\n`;
    const gap = text.endsWith('\n') ? '\n' : '\n\n';
    return `${text}${gap}${AGENTS_SECTION}\n`;
  }

  const end = text.indexOf(END, begin);
  if (end === -1) return null;
  return text.slice(0, begin) + AGENTS_SECTION + text.slice(end + END.length);
}
