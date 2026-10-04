# Tasks

## 1. Harness first: watch ancestry fail

- [ ] 1.1 In `scripts/gates/refusal-cases.sh` section 7, make `feat/shipped` propose a change directory (`propose "$R" '2026-01-07-shipped'`, committed with the code) so a base-tree check has something to find. Acceptance: the existing `--no-ff` observations still print `ok`. Verify: `sh scripts/gates/refusal-cases.sh` exits 0.
- [ ] 1.2 Add a helper that merges `origin/<branch>` into the base from the `merger` clone in one of three styles: `noff` (today's command), `rebase` (cherry-pick each branch commit with a different committer), `squash` (`git merge --squash` and one commit). Acceptance: the existing `--no-ff` call sites use it unchanged in effect. Verify: harness exits 0.
- [ ] 1.3 Add a section 7a that builds rebase-merged and squash-merged branches and runs today's `detect_merged` on each. Acceptance: both print `fail`, which shows the defect before the fix. Verify: harness exits 1 with exactly those two failures. Do not commit this state on its own.

## 2. The base-tree detection

- [ ] 2.1 Replace `detect_merged` with the two `git ls-tree -d --name-only "origin/$BASE"` commands from design.md decision 1, preceded by `git rev-parse --verify -q "origin/$BASE^{commit}"`. The function takes the change name as `$2`. Add `detect_inversion` with the first command alone. Acceptance: the section 7a observations from 1.3 now print `ok`. Verify: harness exits 0.
- [ ] 2.2 Update every `detect_merged` call site to pass the change name, and section 5's inversion check (`detect_merged && detect_open`) to `detect_inversion`. Reword the `observe` messages that say "HEAD is an ancestor" so they name the base tree. Acceptance: `grep -n 'ancestor' scripts/gates/refusal-cases.sh` prints nothing. Verify: harness exits 0.
- [ ] 2.3 In section 7a, add the remaining cases from the spec, each in both directions where it has two: same-line later work on the base after a squash merge (merged), a post-merge commit on the branch (merged), a reverted merge (unmerged), an unmerged branch while the base moves (unmerged), and an unresolvable `origin/<base>` (the check stops, not "unmerged"). Acceptance: every scenario in `specs/merged-change-detection/spec.md` maps to one `observe` line. Verify: harness exits 0 and prints each new `ok`.
- [ ] 2.4 In section 5, add: archive committed on the branch after the merge, not yet in the base, still reads as the inversion; archived in the base closes. Verify: harness exits 0 with both new `ok` lines.

## 3. The commands and their prose

- [ ] 3.1 In `commands/stop-change.md` step 3, replace the `merge-base --is-ancestor && find` block with the fetch, the `rev-parse --verify` guard and the first `ls-tree` command. State that the check reads the base, not `HEAD`, so any merge style is caught. Acceptance: the commands match the harness text exactly. Verify: `grep -n 'is-ancestor' commands/stop-change.md` prints nothing.
- [ ] 3.2 In `commands/stop-change.md` `--abandon` step 1, replace the ancestry check with the guard and both `ls-tree` commands; either printing a line means already merged. Acceptance: a revert is named as reading unmerged. Verify: `grep -n 'ls-tree' commands/stop-change.md` hits steps 3 and abandon 1.
- [ ] 3.3 In `skills/openspec-change-flow/SKILL.md` ("Stopping the flow") and `docs/change-flow.md` (inversion paragraph and "Already-merged work"), add one sentence each: merged is the change directory in the base tree, whatever the merge style. Verify: `grep -n 'base tree' skills/openspec-change-flow/SKILL.md docs/change-flow.md` hits both.
- [ ] 3.4 Run the full local checks: `sh scripts/gates/refusal-cases.sh`, `openspec validate --strict detect-rebase-merged-work`, and the `check-specs` job command from `.github/workflows/ci.yml`. Acceptance: all exit 0. Verify: paste each exit code in the PR description.
