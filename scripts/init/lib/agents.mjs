/**
 * The openspec-steward section init keeps in a consumer's root `AGENTS.md`.
 *
 * Agents other than Claude Code read `AGENTS.md` and never see this plugin's
 * skills, so this is where they learn the flow. The section states the order
 * and its one gate, and points at `openspec/config.yaml` for the artifact rules
 * rather than repeating them: two copies of the rules would drift apart.
 *
 * The section sits between two HTML comments, so a later run can find it and
 * replace it after a plugin upgrade without touching the rest of the file. A
 * begin marker with no end marker is left for a human: guessing where the old
 * section ends could delete text that was never ours.
 */

export const BEGIN = '<!-- openspec-steward:begin -->';
export const END = '<!-- openspec-steward:end -->';

export const AGENTS_SECTION = `${BEGIN}
## OpenSpec change flow

Changes to this repository go through the openspec-steward flow. From
\`/start-change\` until \`/stop-change\`, this order binds:

\`\`\`
explore -> propose -> apply -> open PR -> verified green -> archive
  -> verify the apply -> merge on explicit request
\`\`\`

- \`/start-change <description>\` opens or resumes a change;
  \`/stop-change <name>\` closes or suspends it. Without Claude Code, follow the
  same order by hand.
- Archive comes before merge, never after.
- Merge is the only gate: it happens only when a human asks for it.
- Write every artifact to the rules in \`openspec/config.yaml\`.
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
