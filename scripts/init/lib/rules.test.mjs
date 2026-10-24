import { readFileSync } from 'node:fs';
import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import {
  STEWARD_RULES,
  findRulesBlock,
  missingRules,
  parseRules,
} from './rules.mjs';

// Steward's rules plus rules of a repository's own, as a hand-merge leaves them.
const SUPERSET = [
  'rules:',
  '  general:',
  '    - Never commit secrets',
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
  '    - Run the gates before marking a task done',
].join('\n');

test('a rules key only inside a comment is no block', () => {
  const text = [
    'schema: spec-driven',
    '',
    '# Example:',
    '#   rules:',
    '#     proposal:',
    '#       - Keep proposals short',
    '',
  ].join('\n');

  strictEqual(findRulesBlock(text), null);
});

test('a top-level rules block is returned', () => {
  const text = [
    'schema: spec-driven',
    'rules:',
    '  proposal:',
    '    - Keep proposals short',
    '',
  ].join('\n');

  strictEqual(
    findRulesBlock(text),
    'rules:\n  proposal:\n    - Keep proposals short',
  );
});

test('the block ends at the next non-blank line at column 0', () => {
  const text = [
    'rules:',
    '  tasks:',
    '    - Small tasks',
    '',
    '# Per-operation guidance (optional)',
    'operations:',
    '  apply: {}',
    '',
  ].join('\n');

  strictEqual(findRulesBlock(text), 'rules:\n  tasks:\n    - Small tasks');
});

test('a rules key nested under another key is not top-level', () => {
  const text = ['lint:', '  rules:', '    - none', ''].join('\n');

  strictEqual(findRulesBlock(text), null);
});

test('a flow-style rules block is returned', () => {
  const text = 'schema: spec-driven\nrules: { tasks: [Small tasks] }\n';

  strictEqual(findRulesBlock(text), 'rules: { tasks: [Small tasks] }');
});

test('trailing whitespace on block lines is trimmed', () => {
  const text = 'rules:  \n  tasks:\t\n    - Small tasks   \n';

  strictEqual(findRulesBlock(text), 'rules:\n  tasks:\n    - Small tasks');
});

test("the shipped rules equal this repository's own", () => {
  const config = readFileSync(
    new URL('../../../openspec/config.yaml', import.meta.url),
    'utf8',
  );

  strictEqual(findRulesBlock(config), STEWARD_RULES);
});

test('the steward block parses into its keys and items, quotes dropped', () => {
  deepStrictEqual(parseRules(STEWARD_RULES), {
    proposal: [
      'Keep proposals under 150 words',
      'Always include a "Non-goals" section',
      'Lead with a 3-bullet TL;DR',
    ],
    design: [
      'ADR format only: Context, Decision, Consequences, Alternatives. No tutorials.',
    ],
    specs: ['Terse requirements; let Given/When/Then scenarios carry the detail'],
    tasks: [
      'Atomic tasks, 2-5 minutes each, with file paths and verification steps',
      'Include acceptance criteria per task',
    ],
  });
});

test('blank and comment lines inside the block are skipped', () => {
  const block = "rules:\n  # ours\n  tasks:\n\n    - 'Small tasks'";

  deepStrictEqual(parseRules(block), { tasks: ['Small tasks'] });
});

test('a block init cannot read parses to null', () => {
  const unreadable = {
    'flow style': 'rules: { tasks: [Small tasks] }',
    'a nested map': 'rules:\n  tasks:\n    small: true',
    'a continuation line': 'rules:\n  tasks:\n    - Small\n      tasks',
    'a second key indentation': 'rules:\n  tasks:\n    - Small\n   specs:\n    - Terse',
    'an item before any key': 'rules:\n    - Small tasks',
    // YAML keeps one of the two, so the block holds less than it shows.
    'a key twice': 'rules:\n  tasks:\n    - Small\n  tasks:\n    - Tested',
  };

  for (const [name, block] of Object.entries(unreadable)) {
    strictEqual(parseRules(block), null, name);
  }
});

test('the steward block misses nothing', () => {
  deepStrictEqual(missingRules(STEWARD_RULES), {});
});

test("a block with the repository's own rules too misses nothing", () => {
  deepStrictEqual(missingRules(SUPERSET), {});
});

test('item order does not matter', () => {
  const lines = STEWARD_RULES.split('\n');
  // Keys in reverse order, and each key's items reversed too.
  const reordered = ['rules:'];
  for (const key of ['tasks', 'specs', 'design', 'proposal']) {
    const start = lines.indexOf(`  ${key}:`);
    let end = start + 1;
    while (end < lines.length && lines[end].startsWith('    ')) end += 1;
    reordered.push(lines[start], ...lines.slice(start + 1, end).reverse());
  }

  deepStrictEqual(missingRules(reordered.join('\n')), {});
});

test('only the absent steward items are reported, under their key', () => {
  const block = SUPERSET.replace(
    '  design:\n    - "ADR format only: Context, Decision, Consequences, Alternatives. No tutorials."\n',
    '',
  );

  deepStrictEqual(missingRules(block), {
    design: [
      'ADR format only: Context, Decision, Consequences, Alternatives. No tutorials.',
    ],
  });
});

test('an unreadable block has no answer', () => {
  strictEqual(missingRules('rules: { tasks: [Small tasks] }'), null);
});
