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

// Steward's rules with a `general:` list and an extra `tasks:` item, as a
// hand-merge that keeps a repository's own rules leaves them.
const SUPERSET = STEWARD_RULES.replace(
  'rules:\n',
  'rules:\n  general:\n    - Never commit secrets\n',
).concat('\n    - Run the gates before marking a task done');

const DESIGN =
  '  design:\n    - "ADR format only: Context, Decision, Consequences, Alternatives. No tutorials."\n';

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

test('rules of its own only refuse, list every steward item, and write nothing', () => {
  const config = 'schema: spec-driven\nrules:\n  tasks:\n    - Mine\n';
  const plan = planInit({ config, agents: null });

  ok(plan.refusal.includes(STEWARD_RULES));
  strictEqual(plan.writes, undefined);
});

test("steward rules plus the repository's own leave the config alone", () => {
  const config = `${FRESH}\n${SUPERSET}\n`;
  const { refusal, writes } = planInit({ config, agents: null });

  strictEqual(refusal, undefined);
  strictEqual(writes.config, undefined);
  strictEqual(writes.agents, `${AGENTS_SECTION}\n`);
});

test('a block missing one steward rule refuses with only that rule', () => {
  const config = `${FRESH}\n${SUPERSET.replace(DESIGN, '')}\n`;
  const plan = planInit({ config, agents: null });

  ok(plan.refusal.endsWith(`rules:\n${DESIGN.trimEnd()}`), plan.refusal);
  ok(!plan.refusal.includes('Keep proposals under 150 words'));
  ok(!plan.refusal.includes('Include acceptance criteria per task'));
  strictEqual(plan.writes, undefined);
});

test('adding the printed rules alongside its own lets the rerun pass', () => {
  const block = SUPERSET.replace(DESIGN, '');
  const refused = planInit({ config: `${block}\n`, agents: null });
  const lines = refused.refusal.split('\n');
  // The printed snippet ends the message; everything under its `rules:` is
  // what the user pastes under their own block.
  const printed = lines.slice(lines.indexOf('rules:') + 1).join('\n');

  const plan = planInit({ config: `${block}\n${printed}\n`, agents: null });

  strictEqual(plan.refusal, undefined);
  strictEqual(plan.writes.config, undefined);
});

test('a printed key pasted next to the same key of its own refuses', () => {
  const config = `${STEWARD_RULES.replace(DESIGN, '')}\n  design:\n    - Mine\n${DESIGN}`;
  const plan = planInit({ config, agents: null });

  match(plan.refusal, /each key once/);
  strictEqual(plan.writes, undefined);
});

test('flow-style rules refuse, naming block style, and write nothing', () => {
  const config = 'schema: spec-driven\nrules: { tasks: [Mine] }\n';
  const plan = planInit({ config, agents: null });

  match(plan.refusal, /block style/);
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
