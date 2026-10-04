# Design

## Context

`/stop-change` decides "merged" with `git merge-base --is-ancestor HEAD
origin/<base>` in two places: step 3 (the inversion refusal) and `--abandon`
step 1. The gates harness mirrors it as `detect_merged`, and builds only
`--no-ff` merges. A rebase or squash merge rewrites the commits, so the branch
head is never an ancestor of the base. That happened after
yannicklescure/openspec-flow#14. See proposal.md.

Exploration built each candidate check in throwaway repositories. The merge
styles were none, `--no-ff`, rebase and squash. Later base work was none, another
file, the same file, or the same line. Some branches gained a commit after the
merge. Results, Y = reads merged:

```
                      anc  cherry  tree  path  mtree  cdir
unmerged (all)         n     n      n     n     n      n
noff     none          Y     Y      Y     Y     Y      Y
noff     same file     Y     Y      n     n     Y      Y
rebase   none          n     Y      Y     Y     Y      Y
rebase   same line     n     Y      n     n     n      Y
squash   none          n     n      Y     Y     Y      Y
squash   same line     n     n      n     n     n      Y
any merged, post-merge
  commit on branch     n     n      n     n     n      Y
```

Column key: `anc` is ancestry. `cherry` is `git cherry` with no `+` lines.
`tree` is `git diff --quiet HEAD origin/<base>`. `path` is the same diff limited
to the branch's paths. `mtree` is `git merge-tree --write-tree` equal to the
base tree. `cdir` is the change directory present in the base tree.

## Decision

1. **Merged is the change directory in the base tree.** After `git fetch -q
   origin`, the change reads as merged when either command prints a line:

   ```bash
   git ls-tree -d --name-only "origin/<base>" -- "openspec/changes/<name>"
   git ls-tree -d --name-only "origin/<base>" -- openspec/changes/archive/ \
     | grep -E "^openspec/changes/archive/[0-9]{4}-[0-9]{2}-[0-9]{2}-<name>\$"
   ```

   The change directory is the one path only this change owns. Later base work
   can move it to `archive/`, but never edits it into something else. The
   date-anchored pattern keeps `x` from matching `fix-x`. `/start-change`
   step 4 forbids reusing a slug, so a name hit is this change.
2. **The inversion is the first command alone.** The base carries the change as
   still proposed. This is a condition on the base, not on `HEAD`. It holds
   until an archive actually reaches the base, including after the archive is
   committed on the branch.
3. **Abandon refuses on either command.** Archived on the base is shipped too.
4. **The base ref must resolve before the check runs.** `git rev-parse --verify
   -q "origin/<base>^{commit}"` comes first. `git ls-tree` on a missing ref
   prints nothing, which would read as "unmerged": an empty green. A missing
   ref stops the command instead.
5. **Git only.** No `gh`. The base tree answers every case above, a revert
   included. The harness can observe it with no network.
6. **Harness.** `detect_merged` and a new `detect_inversion` run these exact
   commands. The harness builds rebase, squash, same-line later work, a
   post-merge branch commit and a revert, each read in both directions. The
   existing `--no-ff` cases stay.

## Consequences

- A merge that is later reverted reads as unmerged, so abandon proceeds. That
  is correct: the code is no longer in the base.
- A branch that never committed its change directory reads as unmerged. The
  flow commits it at `propose`, before any code, so this needs work outside the
  flow.
- A proposal merged ahead of its code reads as merged. Both refusals then err
  toward refusing. The flow's order (one PR) does not produce this state.
- The check depends on slug uniqueness. That makes `/start-change` step 4 more
  load-bearing than it was.

## Alternatives

- **Ancestry (today).** Rejected: fails every rebase and squash merge.
- **`git cherry`.** Rejected: a squash merge does not keep per-commit patch IDs.
- **Whole-tree diff.** Rejected: any later base work reads as unmerged.
- **Diff limited to the change's paths.** Rejected: later base work on the same
  file reads as unmerged. This answers the plan's first open question.
- **`git merge-tree` equal to the base tree.** Rejected: same-line later work
  conflicts and reads as unmerged.
- **`gh pr view --json state`.** Rejected: needs network and a PR. Reads a
  reverted merge as `MERGED`. The harness cannot observe it. This answers the
  plan's second open question: there is nothing to fall back from.
