---
slug: detect-rebase-merged-work
title: Detect rebase-merged work
created: 2026-10-03
source: /stop-change todo-plans, after yannicklescure/openspec-flow#14 was rebase-merged
---

## Why

`/stop-change` decides "merged" with `git merge-base --is-ancestor HEAD
origin/<base>`. A rebase merge (or a squash merge) rewrites the commits, so the
branch head is never an ancestor of the base even when its content shipped.
After #14 was rebase-merged, the check printed **no** while the PR read
`MERGED` and `git diff HEAD origin/master` was empty.

Two refusals rest on that check and both miss rebase- or squash-merged work:

- `commands/stop-change.md` step 3, the inversion check: a change merged before
  it was archived would be closed as tidy.
- `commands/stop-change.md` `--abandon` step 1: work that already shipped would
  not be refused, and the branch would be deleted. The verified tag still keeps
  the commits, but the step exists to refuse exactly this.

The gates harness (`detect_merged` in `scripts/gates/refusal-cases.sh`) only
builds `--no-ff` merges, so it never saw the gap.

## What

- Decide "merged" from the pull request when there is one
  (`gh pr view <n> --json state` reads `MERGED`), and fall back to git when
  there is none.
- The git fallback must survive rewritten commits: an empty
  `git diff HEAD origin/<base> -- <the change's paths>`, or `git cherry`, rather
  than ancestry alone.
- Add rebase-merge and squash-merge cases to the gates harness, in both
  directions, next to the existing `--no-ff` case.
- Check `/archive-on-green` and the skill for the same assumption.

## Open questions

- Is a tree comparison scoped to the change's own paths enough, or does later
  work on the base touching the same files make it read "unmerged"?
- Should an unreachable `gh` make the check refuse, or fall back to git?
