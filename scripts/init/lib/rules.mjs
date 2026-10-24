/**
 * The artifact rules init writes into a consumer's `openspec/config.yaml`, and
 * how init finds a `rules:` block that is already there.
 *
 * The package has no dependencies, so there is no YAML parser. It does not need
 * one: `openspec init` writes `rules:` only inside a `# Example:` comment, so a
 * line starting `rules:` at column 0 is a block someone added. The block runs to
 * the next non-blank line at column 0, which is the next key or comment.
 *
 * Init never writes into a block that is there. It only asks whether the block
 * holds every steward rule, so a repository can keep rules of its own next to
 * them. That question is answered over block style only, the style `openspec
 * init`'s example and every consumer seen so far use; any other shape is
 * unreadable, and unreadable ends in a refusal rather than a guess.
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

const KEY = /^( +)([A-Za-z_][\w-]*):\s*$/;
const ITEM = /^( +)- (.*\S)\s*$/;

/** An item's text without surrounding whitespace or one pair of outer quotes. */
function itemText(raw) {
  const text = raw.trim();
  const quote = text[0];
  if (text.length >= 2 && (quote === '"' || quote === "'") && text.at(-1) === quote) {
    return text.slice(1, -1);
  }
  return text;
}

/**
 * A `rules:` block (as `findRulesBlock` returns it) read into artifact key ->
 * item texts, or `null` when it is not block style: `rules:` alone on its line,
 * every key once and at one indentation, every item a `- text` line deeper
 * than its key.
 * Blank lines and `#` comment lines are skipped.
 */
export function parseRules(block) {
  const [first, ...rest] = block.split('\n');
  if (!/^rules:\s*$/.test(first)) return null;

  const rules = {};
  let keyIndent = null;
  let current = null;
  for (const line of rest) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const key = line.match(KEY);
    if (key) {
      keyIndent ??= key[1].length;
      if (key[1].length !== keyIndent) return null;
      current = key[2];
      // YAML keeps only one of two equal keys, so a repeated key holds less
      // than the text shows.
      if (current in rules) return null;
      rules[current] = [];
      continue;
    }

    const item = line.match(ITEM);
    if (!item || current === null || item[1].length <= keyIndent) return null;
    rules[current].push(itemText(item[2]));
  }
  return rules;
}

/**
 * The steward items a `rules:` block lacks, as key -> item texts with only the
 * keys that lack something, or `null` when the block is unreadable. Other keys,
 * other items and order do not matter.
 */
export function missingRules(block) {
  const rules = parseRules(block);
  if (rules === null) return null;

  const missing = {};
  for (const [key, items] of Object.entries(parseRules(STEWARD_RULES))) {
    const absent = items.filter((item) => !(rules[key] ?? []).includes(item));
    if (absent.length > 0) missing[key] = absent;
  }
  return missing;
}

/**
 * `missing` (as `missingRules` returns it) as a `rules:` block, each line as
 * `STEWARD_RULES` spells it, so the quoting a user copies is already right.
 */
export function formatRules(missing) {
  const out = ['rules:'];
  let key = null;
  for (const line of STEWARD_RULES.split('\n').slice(1)) {
    const keyMatch = line.match(KEY);
    if (keyMatch) {
      key = keyMatch[2];
      if (key in missing) out.push(line);
    } else if (missing[key]?.includes(itemText(line.match(ITEM)[2]))) {
      out.push(line);
    }
  }
  return out.join('\n');
}
