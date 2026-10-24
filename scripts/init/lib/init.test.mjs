import { deepStrictEqual, match, ok, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { AGENTS_SECTION, BEGIN } from './agents.mjs';
import { planInit } from './init.mjs';
import { STEWARD_RULES } from './rules.mjs';

// What `openspec init` 1.14.3 writes: `rules:` only inside a comment.
const FRESH = [
  'schema: spec-driven',
  '',
  '# Per-artifact rules (optional)',
  '# Example:',
  '#   rules:',
  '#     proposal:',
  '#       - Keep proposals under 500 words',
  '',
].join('\n');

const WITH_RULES = `${FRESH}\n${STEWARD_RULES}\n`;

test('no config refuses, naming openspec init, and writes nothing', () => {
  const plan = planInit({ config: null, agents: null });

  match(plan.refusal, /openspec init/);
  strictEqual(plan.writes, undefined);
});

test('a fresh config gets the rules appended, prefix unchanged', () => {
  const { writes } = planInit({ config: FRESH, agents: null });

  ok(writes.config.startsWith(FRESH));
  strictEqual(writes.config, WITH_RULES);
});

test('a config with no final newline gets one before the rules', () => {
  const { writes } = planInit({ config: 'schema: spec-driven', agents: null });

  strictEqual(writes.config, `schema: spec-driven\n\n${STEWARD_RULES}\n`);
});

test('identical rules leave the config alone', () => {
  const { writes } = planInit({ config: WITH_RULES, agents: null });

  strictEqual(writes.config, undefined);
  strictEqual(writes.agents, `${AGENTS_SECTION}\n`);
});

test('differing rules refuse, print the steward block, and write nothing', () => {
  const config = 'schema: spec-driven\nrules:\n  tasks:\n    - Mine\n';
  const plan = planInit({ config, agents: null });

  ok(plan.refusal.includes(STEWARD_RULES));
  strictEqual(plan.writes, undefined);
});

test('an unclosed section in AGENTS.md refuses and writes nothing', () => {
  const plan = planInit({ config: FRESH, agents: `${BEGIN}\nold\n` });

  match(plan.refusal, /AGENTS\.md/);
  strictEqual(plan.writes, undefined);
});

test('a plan applied once yields no writes the second time', () => {
  const first = planInit({ config: FRESH, agents: '# Agents\n' });
  const second = planInit({
    config: first.writes.config,
    agents: first.writes.agents,
  });

  deepStrictEqual(second, { writes: {} });
});
