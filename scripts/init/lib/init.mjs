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
import {
  STEWARD_RULES,
  findRulesBlock,
  formatRules,
  missingRules,
} from './rules.mjs';

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
  } else {
    const missing = missingRules(existing);
    if (missing === null) {
      return {
        refusal: [
          'openspec/config.yaml has a rules: block init cannot read: it reads',
          'block style only, each key once, with a `- item` list under it.',
          'Nothing was written. Rewrite the block in block style, keeping your',
          'own rules and adding these, then run init again:',
          '',
          STEWARD_RULES,
        ].join('\n'),
      };
    }
    if (Object.keys(missing).length > 0) {
      return {
        refusal: [
          'openspec/config.yaml has a rules: block without every',
          'openspec-steward rule. Nothing was written. Add these items under',
          'their keys, next to your own rules (a key you already have takes',
          'the items, not a second copy of the key), then run init again:',
          '',
          formatRules(missing),
        ].join('\n'),
      };
    }
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
