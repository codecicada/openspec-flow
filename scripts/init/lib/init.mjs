/**
 * What init writes, decided before anything is written.
 *
 * Both files are planned together so that any refusal writes nothing: a run
 * that refuses on `AGENTS.md` must not have already changed `config.yaml`.
 * `index.mjs` owns the reads and writes and acts on the plan only when it holds
 * no refusal.
 *
 * Pure over file contents (`null` when a file is absent).
 */

import { applySection } from './agents.mjs';
import { STEWARD_RULES, findRulesBlock } from './rules.mjs';

/**
 * `{ refusal }` with a message for the user, or `{ writes }` mapping `config`
 * and `agents` to their new text. A file that needs no change is left out of
 * `writes`, so an empty `writes` means init has nothing to do.
 */
export function planInit({ config, agents }) {
  if (config === null) {
    return {
      refusal:
        'openspec/config.yaml not found. Run `openspec init` first, then run init again.',
    };
  }

  const writes = {};
  const existing = findRulesBlock(config);
  if (existing === null) {
    const gap = config === '' ? '' : config.endsWith('\n') ? '\n' : '\n\n';
    writes.config = `${config}${gap}${STEWARD_RULES}\n`;
  } else if (existing !== STEWARD_RULES) {
    return {
      refusal: [
        'openspec/config.yaml already has a rules: block that differs from the',
        'openspec-steward rules. Nothing was written. Merge this block by hand,',
        'then run init again:',
        '',
        STEWARD_RULES,
      ].join('\n'),
    };
  }

  const nextAgents = applySection(agents);
  if (nextAgents === null) {
    return {
      refusal:
        'AGENTS.md has an openspec-steward begin marker with no end marker. Nothing was written. Fix or remove the section, then run init again.',
    };
  }
  if (nextAgents !== agents) writes.agents = nextAgents;

  return { writes };
}
