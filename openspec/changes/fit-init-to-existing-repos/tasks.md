# Tasks

## 1. Reading the rules block

- [ ] 1.1 Add tests to `scripts/init/lib/rules.test.mjs` for `parseRules(block)`: `STEWARD_RULES` gives its four keys and their items with quotes dropped; blank and `#` lines are skipped; flow style, a nested map, a continuation line and a second key indentation each give `null`. Verify `npm test` fails on the missing export. Accept: the run errors on `parseRules`.
- [ ] 1.2 Add tests for `missingRules(block)`: `STEWARD_RULES` gives none; steward plus a `general:` key and an extra `tasks:` item gives none; reordered items give none; a block without the `design:` item gives only that; an unreadable block gives `null`. Verify `npm test` fails. Accept: the run errors on `missingRules`.
- [ ] 1.3 Implement `parseRules` and `missingRules` in `scripts/init/lib/rules.mjs`; verify `npm test` passes. Accept: all 1.1 and 1.2 cases green, existing rules tests unchanged.

## 2. Plan

- [ ] 2.1 In `scripts/init/lib/init.test.mjs`, add: a superset block writes no config and writes the section; a block missing `design:` refuses, prints `design:` and its item and no other steward item, writes nothing; a refused block with the printed items added yields no refusal; flow-style rules refuse naming block style and print `STEWARD_RULES`. Change the existing differing-rules test to expect every steward item listed. Verify `npm test` fails on the superset case. Accept: the superset case red.
- [ ] 2.2 Rework `planInit` in `scripts/init/lib/init.mjs` to the three outcomes of design decision 3; verify `npm test` passes. Accept: all 2.1 cases green.
- [ ] 2.3 Reproduce with the bin: `node scripts/init/index.mjs --root <scratch>` on steward rules plus `general:` and an extra `tasks:` item. Accept: exit 0, `config.yaml` unchanged, `AGENTS.md` created.

## 3. Section

- [ ] 3.1 In `scripts/init/lib/agents.test.mjs`, add: the section is at most 7 lines; it does not contain `only gate`; it names `openspec/config.yaml`, the repository's own approval rules and `docs/change-flow.md`; replace the `only gate` assertion. Verify `npm test` fails. Accept: the line-count case red.
- [ ] 3.2 Rewrite `AGENTS_SECTION` in `scripts/init/lib/agents.mjs` to the pointer form and update its header comment; verify `npm test` passes. Accept: all section tests green.

## 4. Docs

- [ ] 4.1 In `README.md`'s setup paragraph, state that a block holding the steward rules is accepted and a refusal prints only what is missing, that the section is 7 lines plus a blank line, and that merge-on-request is the flow's gate while the repository's own approval rules still bind. Verify `grep -n 'seven\|approval' README.md`. Accept: all three stated.
- [ ] 4.2 In `commands/init.md`, say the refusal prints the missing items and that adding them alongside the repository's own rules lets a rerun pass; keep the "do not merge yourself" rule. Verify `npm run test:plugin`. Accept: green, body under 30 lines.

## 5. Integration

- [ ] 5.1 Run `npm test`, `npm run test:bin`, `npm run test:gates`, `npm run test:plugin` and `node scripts/check-specs/index.mjs`. Accept: all green.
