/**
 * The artifact rules init writes into a consumer's `openspec/config.yaml`, and
 * how init finds a `rules:` block that is already there.
 *
 * The package has no dependencies, so there is no YAML parser. It does not need
 * one: `openspec init` writes `rules:` only inside a `# Example:` comment, so a
 * line starting `rules:` at column 0 is a block someone added. The block runs to
 * the next non-blank line at column 0, which is the next key or comment. Init
 * compares blocks as text, never merges them, so a block this cannot read
 * cleanly ends in a refusal rather than a corrupted file.
 *
 * `STEWARD_RULES` must equal the `rules:` block of this repository's own
 * `openspec/config.yaml`; `rules.test.mjs` fails when the two drift. That file
 * is not shipped (`openspec/` is not in the package's `files`), which is why the
 * text is copied here rather than read at run time.
 */

export const STEWARD_RULES = [
  'rules:',
  '  proposal:',
  '    - Keep proposals under 150 words',
  '    - Always include a "Non-goals" section',
  '    - Lead with a 3-bullet TL;DR',
  '  design:',
  '    - "ADR format only: Context, Decision, Consequences, Alternatives. No tutorials."',
  '  specs:',
  '    - Terse requirements; let Given/When/Then scenarios carry the detail',
  '  tasks:',
  '    - Atomic tasks, 2-5 minutes each, with file paths and verification steps',
  '    - Include acceptance criteria per task',
].join('\n');

/**
 * The top-level `rules:` block of a config file's text, with trailing
 * whitespace trimmed from each line and trailing blank lines dropped, or `null`
 * when the file has none.
 */
export function findRulesBlock(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^rules:/.test(line));
  if (start === -1) return null;

  let end = start + 1;
  while (end < lines.length && !/^\S/.test(lines[end])) end += 1;

  const block = lines.slice(start, end).map((line) => line.trimEnd());
  while (block.at(-1) === '') block.pop();
  return block.join('\n');
}
