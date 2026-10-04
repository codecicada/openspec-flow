# Tasks

## 1. Writing a plan

- [x] 1.1 Add a "Deferring a change" section to `skills/openspec-change-flow/SKILL.md` with the threshold (recommends a specific change for later; a mention does not count), the path `todo/<slug>.md`, the frontmatter (`slug`, `title`, `created`, `source`) and body headings (`Why`, `What`, `Open questions`). Acceptance: the section states that a plan is not a proposal and creates nothing under `openspec/changes/`. Verify: `grep -n 'todo/<slug>.md' skills/openspec-change-flow/SKILL.md` hits the new section.
- [x] 1.2 In the same section, add the slug-uniqueness check commands (`ls todo/<slug>.md`, and the `find openspec/changes -maxdepth 2 -type d -name '*<slug>*'` search) and the rule to update an existing plan for the same work. Acceptance: all three cases in the "Plan slug is unique" requirement are covered. Verify: read the section against `specs/deferred-change-plans/spec.md`.
- [x] 1.3 In the same section, add the commit rule: `git add -- todo/<slug>.md` and `git commit -m 'chore(todo): defer <slug>' -- todo/<slug>.md`, then name the path to the user. Acceptance: no directory add appears. Verify: `grep -n 'git add todo' skills/openspec-change-flow/SKILL.md` prints nothing.
- [x] 1.4 Add `todo/` to the flow diagram at the top of `skills/openspec-change-flow/SKILL.md` and bump `version` to `0.3.0`. Verify: `head -20 skills/openspec-change-flow/SKILL.md` shows both.
- [x] 1.5 Add a "Deferring a change" section to `docs/change-flow.md` and a `todo/<slug>.md` row to "Where each state lives". Verify: `grep -n 'todo/' docs/change-flow.md` hits both places.
- [x] 1.6 Add `todo/` plans to "What's in it" in `README.md`. Verify: `grep -n 'todo/' README.md` hits.
- [x] 1.7 In `scripts/gates/refusal-cases.sh`, add `detect_plan() { [ -f "$1/todo/$2.md" ]; }` and a `# deferred plans` section that observes a plan present for its slug and absent for another slug. Acceptance: both directions are printed. Verify: `sh scripts/gates/refusal-cases.sh` exits 0 and prints the two new `ok` lines.

## 2. Picking a plan up

- [x] 2.1 In `commands/start-change.md` step 0, add `find todo -maxdepth 1 -type f -name '*.md' 2>/dev/null` beside the active-changes search, with the same matching rule: an exact slug or a plain match uses the plan's slug, and a possible match lists the candidates and asks. Verify: `grep -n 'find todo' commands/start-change.md` hits step 0.
- [x] 2.2 In the same step, state that a picked-up plan seeds `propose` and does not answer step 1, so "does this deserve a change?" is still answered out loud. Verify: read step 0 and step 1 together.
- [x] 2.3 In step 4, rule out a freshly minted slug that matches a plan for different work. In step 6, report the plan used as the seed, or "none". Verify: `grep -n 'todo/' commands/start-change.md` hits steps 4 and 6.
- [x] 2.4 Update "Opening or resuming the flow" in `skills/openspec-change-flow/SKILL.md` and "Opening the flow" in `docs/change-flow.md` to mention plan pickup. Verify: `grep -n 'todo/' skills/openspec-change-flow/SKILL.md docs/change-flow.md` hits both sections.
- [x] 2.5 In the harness `/start-change` section, observe that the step 0 `find todo` command lists a committed plan, and prints nothing (exit 0) in a repository without `todo/`. Verify: `sh scripts/gates/refusal-cases.sh` exits 0 with the two new `ok` lines.

## 3. Removing a plan on archive

- [x] 3.1 In `commands/archive-on-green.md`, add `git rm -q --ignore-unmatch -- todo/<name>.md` after step 4, and add `todo/<name>.md` to step 6's explicit path list. Report whether a plan was removed. Verify: `grep -n 'ignore-unmatch' commands/archive-on-green.md` hits.
- [x] 3.2 In `commands/stop-change.md` `--abandon`, state that `todo/<name>.md` is left untouched. Verify: `grep -n 'todo/' commands/stop-change.md` hits the abandon section.
- [x] 3.3 Update "After archiving" and "Stopping the flow" in `skills/openspec-change-flow/SKILL.md`, and "Archive on green" and "Abandoning a change" in `docs/change-flow.md`, to match tasks 3.1 and 3.2. Verify: the `grep -n 'todo/'` command hits each section.
- [x] 3.4 In the harness, add an `/archive-on-green` section. With a plan present, the `git rm` command stages the deletion (`git diff --cached --name-only` prints `todo/<slug>.md`). With the plan absent, the command exits 0 and stages nothing. Verify: `sh scripts/gates/refusal-cases.sh` exits 0 with the two new `ok` lines.
- [x] 3.5 Add to the harness's "not demonstrated" note that whether an agent writes a plan at the right moment is a judgment, and no command observes it. Verify: the run prints the new line.

## 4. Suggesting slash commands

- [x] 4.1 Add a "Suggesting a slash command" section to `skills/openspec-change-flow/SKILL.md`. Rule: inline code or an untagged fence; never `bash`, `sh`, `zsh`, `shell` or `console`. Include the incident: the shell error, and the agent then acting as though the flow had opened. Acceptance: the section says shell commands keep their `bash` fence. Verify: `grep -n 'Suggesting a slash command' skills/openspec-change-flow/SKILL.md` hits.
- [x] 4.2 In `commands/start-change.md`, where the command tells the user to rerun (no argument, archived slug), point to that section. Verify: `grep -n 'Suggesting a slash command' commands/start-change.md` hits.
- [x] 4.3 Make the "Deferring a change" section from task 1.1 show the pickup as inline `/start-change <slug>`. Verify: the scan in task 4.4 passes.
- [x] 4.4 In `scripts/gates/refusal-cases.sh`, add a scan of `commands/`, `skills/`, `docs/` and `README.md` for a line in a fence tagged `bash|sh|zsh|shell|console` that is a slash command (`/name`, ending at a space or the line end, so `/usr/bin/x` is not one). Observe both directions on a throwaway file: a planted bad fence is reported, an untagged fence is not. Acceptance: the repository itself scans clean. Verify: `sh scripts/gates/refusal-cases.sh` exits 0 with the new `ok` lines.
- [x] 4.5 Add one line to "Stage explicit paths" or a sibling section in `docs/change-flow.md` that points to the skill rule. Verify: `grep -n 'slash command' docs/change-flow.md` hits.

## 5. Integration

- [x] 5.1 Run `openspec validate todo-plans --strict`. Verify: it exits 0.
- [x] 5.2 Run `npm test` and `npm run test:gates`. Verify: both exit 0, and the gates run prints "every observation held".
