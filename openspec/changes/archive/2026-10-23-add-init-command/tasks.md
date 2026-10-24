# Tasks

## 1. Test harness

- [x] 1.1 In `scripts/check-specs/run-tests.sh`, search `scripts/` instead of `scripts/check-specs/` and update the empty-list message to match; verify `npm test` reports the same pass count as before. Accept: count unchanged, message names `scripts`.

## 2. Rules block

- [x] 2.1 Add `scripts/init/lib/rules.test.mjs` for `findRulesBlock(text)`: commented-only `rules:` gives `null`; top-level block is returned; block ends at the next non-blank column-0 line; flow-style `rules: {...}` is returned. Verify `npm test` fails on the missing module. Accept: the run errors on `rules.mjs`.
- [x] 2.2 Create `scripts/init/lib/rules.mjs` exporting `STEWARD_RULES` and `findRulesBlock`; verify `npm test` passes. Accept: all 2.1 cases green.
- [x] 2.3 Add a drift test to `scripts/init/lib/rules.test.mjs`: `findRulesBlock` over this repo's `openspec/config.yaml` equals `STEWARD_RULES`. Verify it passes, then change one word in `STEWARD_RULES`, see it fail, and restore. Accept: one red run observed, then green.

## 3. AGENTS.md section

- [x] 3.1 Add `scripts/init/lib/agents.test.mjs` for `applySection(text)`: `null` gives the section alone; no markers appends after one blank line with prior text unchanged; markers replace only what lies between; the current section returns identical text; the section contains no rule text. Verify `npm test` fails on the missing module. Accept: the run errors on `agents.mjs`.
- [x] 3.2 Create `scripts/init/lib/agents.mjs` exporting `AGENTS_SECTION` (order, `/start-change`, `/stop-change`, archive before merge, merge as the only gate) and `applySection`; verify `npm test` passes. Accept: all 3.1 cases green.

## 4. Plan

- [x] 4.1 Add `scripts/init/lib/init.test.mjs` for `planInit({ config, agents })`, one test per `project-init` scenario except the slash command: no config refuses naming `openspec init`; fresh config appends with prefix unchanged; identical rules write no config; differing rules refuse, print `STEWARD_RULES`, write nothing; a plan applied twice yields no writes. Verify `npm test` fails on the missing module. Accept: the run errors on `init.mjs`.
- [x] 4.2 Create `scripts/init/lib/init.mjs` exporting `planInit`, returning `{ refusal }` or `{ writes }`; verify `npm test` passes. Accept: all 4.1 cases green.

## 5. Bin

- [x] 5.1 Create `scripts/init/index.mjs`: `--help`, `--root`, read both files, plan, write only without refusal, print what changed, exit 0 or 1, and copy the `realpathSync` entry guard from `scripts/check-specs/index.mjs`. Verify in a scratchpad repo after `openspec init --tools none`: first run exits 0 and writes both files, second run exits 0 with `git diff` empty. Accept: both runs as described.
- [x] 5.2 Add `"openspec-steward-init": "scripts/init/index.mjs"` to `bin` in `package.json`; verify `npm pack --dry-run` lists `scripts/init/index.mjs`. Accept: listed, and `package.json` parses with `node -e`.
- [x] 5.3 Add observation F to `scripts/check-specs/smoke-bin.sh` and its header list: the installed `openspec-steward-init` on a fixture with a fresh `config.yaml` exits 0 and the file then contains `rules:` at column 0. Verify `npm run test:bin` passes. Accept: F reported ok.
- [x] 5.4 Watch F fail: in the installed copy, replace the entry guard with a direct `argv[1]` equality, confirm F fails, then restore; verify `npm run test:bin` is green again. Accept: one red run observed, then green.

## 6. Slash command

- [x] 6.1 Confirm `${CLAUDE_PLUGIN_ROOT}` expands in command markdown, from the `plugin-dev:command-development` skill or Claude Code docs. Accept: a cited source; if none, update `design.md` decision 1 before 6.2.
- [x] 6.2 Create `commands/init.md` (frontmatter `name: init` and `description`) that runs `node "${CLAUDE_PLUGIN_ROOT}/scripts/init/index.mjs" --root "$(git rev-parse --show-toplevel)"`, reports output and exit status, and on refusal shows the printed block without editing files. Verify `claude plugin validate .` passes. Accept: validation passes, command body under 30 lines.

## 7. Documentation

- [x] 7.1 Add `/init` to the command table in `README.md` and a "Set up the consumer" step in Install with both `/openspec-steward:init` and `node <plugin>/scripts/init/index.mjs --root .`; verify `grep -n 'init' README.md` shows the row and the step. Accept: both present.
- [x] 7.2 Add `/init` where `docs/README.md` lists commands and files; verify `grep -n '/init\|scripts/init' docs/README.md` matches the diagram and the file list. Accept: both present. (`docs/change-flow.md` draws the flow and lists no commands; init is setup, not a flow step, so it stays out.)

## 8. Integration

- [x] 8.1 Run `npm test`, `npm run test:bin`, `npm run test:gates`, `node scripts/check-specs/index.mjs --root .` and `openspec validate add-init-command --strict`; verify all exit 0. Accept: five green runs.

## Workflow follow-up

- Open the PR, verify green by name against the head SHA, archive, verify the apply.
- Merge on explicit request. Release and the README `ref` bump stay separate.
