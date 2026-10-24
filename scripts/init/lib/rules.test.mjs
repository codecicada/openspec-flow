import { readFileSync } from 'node:fs';
import { strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { STEWARD_RULES, findRulesBlock } from './rules.mjs';

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
