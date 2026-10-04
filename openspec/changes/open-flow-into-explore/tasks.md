# Tasks

## 1. Opening into explore

- [x] 1.1 In `commands/start-change.md` step 6, replace the order block with `explore -> propose -> apply -> open PR -> verified green -> archive` / `-> verify the apply -> merge on explicit request`. Acceptance: the block begins `explore -> propose`. Verify: `grep -n 'explore -> propose' commands/start-change.md` hits step 6.
- [x] 1.2 After the order block, add: on a fresh open, enter explore now with the description (`openspec-explore`), without waiting for the user; on a resume, enter the next step `STOPPED.md` records. Acceptance: covers the "Fresh open enters explore" and "Resume enters the recorded next step" requirements. Verify: read step 6 against `specs/change-flow-opening/spec.md`.
- [x] 1.3 In the same place, state that explore writes no code and opens no change, and that its findings seed `propose`. Acceptance: the text does not say explore "writes nothing". Verify: `grep -n -i 'writes nothing' commands/start-change.md` prints nothing.
- [x] 1.4 Update the frontmatter `description` in `commands/start-change.md` to end with entering explore. Verify: `head -4 commands/start-change.md` shows it.

## 2. Stop before propose

- [x] 2.1 In `commands/stop-change.md` step 4, add a first branch: when `openspec/changes/<name>/` does not exist, write no `STOPPED.md`; offer `todo/<name>.md` with `Why`, `What` and `Open questions` from the exploration; on yes, commit it with `git add -- todo/<name>.md`; on no, report that nothing on disk records the work. Acceptance: the three scenarios in `specs/deferred-change-plans/spec.md` are covered. Verify: `grep -n 'todo/<name>.md' commands/stop-change.md` hits step 4.
- [x] 2.2 In the same step, state that a change directory explore created takes the existing `STOPPED.md` path. Verify: read step 4.

## 3. Skill and docs

- [x] 3.1 In `skills/openspec-change-flow/SKILL.md`, state under "Opening or resuming the flow" that a fresh open enters explore and a resume enters the recorded next step; under "Stopping the flow", add the stop-before-propose plan offer. Verify: `grep -n -i 'enters explore\|before .propose' skills/openspec-change-flow/SKILL.md` hits both sections.
- [x] 3.2 In `docs/change-flow.md`, add a `resume` edge from the resume node to the recorded next step, and add the stop-before-propose branch to the stop diagram. Acceptance: mermaid still parses. Verify: `grep -n 'todo/' docs/change-flow.md` hits the stop section.

## 4. Checks

- [x] 4.1 Run `npm test`, `npm run test:gates` and `openspec validate open-flow-into-explore --strict`. Acceptance: all exit 0. Verify: exit codes.
