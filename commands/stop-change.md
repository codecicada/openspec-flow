---
name: stop-change
description: Close the OpenSpec change flow for a named change — verify it actually reached its end — or with --abandon destroy the change and its code, after pinning the commits to a verified remote tag.
---

Close the flow for one named OpenSpec change. Take the name from the argument.

Two modes:

- **no flag** — the change reached its end. Verify that it did, rather than
  taking the request as evidence.
- **`--abandon`** — the change is being given up. Destroy it: the proposal, the
  code, the branch and the pull request. Pin the commits to a remote tag first,
  and verify the pin before deleting anything.

`--abandon` refuses without an explicit name. Every other step here reads state;
this one deletes branches and code, and inferring *which* change from
`openspec list` is how the wrong work gets destroyed.

Neither mode merges anything. Merge is still the gate, and still the human's.

## Closing a finished change

**1. Refuse while the change is still unarchived.**

```bash
find openspec/changes -mindepth 1 -maxdepth 1 -type d ! -name archive
ls -d openspec/changes/archive/*<name>* 2>/dev/null
```

A directory still under `openspec/changes/` means `openspec archive` never ran.
Report it and stop — `/archive-on-green` is the step that was skipped.

This refusal is the one with a receipt. In the session that produced this
command, a change was merged first and archived afterwards, in a second pull
request needing a second merge. That inverts step 7 of `/archive-on-green`
("stop before merging") and costs exactly the extra gate the one-gate design
exists to remove. Nothing refused it, because nothing was watching the order.

**2. Refuse while anything is still outstanding.**

```bash
git log --oneline @{upstream}..HEAD
gh pr view <n> --json state,mergedAt,mergeCommit
```

Unpushed commits: push, then reopen this. An open pull request: the change has
not reached its end — report what remains (checks running, review outstanding,
merge not requested) and hold. Do not merge to satisfy this command.

**3. Report the close.**

The change name, the archived path, the merge commit, and one line saying the
flow is closed: the order established at `/start-change` no longer binds, and
nothing about this change proceeds on green any more.

## Abandoning a change (`--abandon`)

Abandon means: this change will not ship, and **everything it produced leaves the
working repository** — the proposal, the implementation code, the branch and the
pull request. The repository ends up as though the change had never been opened.

It is a destructive mode, and it says so. What it must never be is *silently*
destructive: the commits are pinned to one recoverable ref on the remote, and
that ref is verified to exist **before** anything is deleted. Destroyed and
recoverable is the goal. Destroyed and reachable only from this machine is the
failure — a spike in the consumer repository survived as six commits on a local
branch and nothing else, no remote, no pull request, no tag, so recovering it
needed the machine it was written on.

So the ordering is: **pin, verify the pin, then destroy.**

**1. Refuse if the work is already merged.**

```bash
git fetch -q origin
git merge-base --is-ancestor HEAD origin/<base> && echo 'already merged'
```

Merged means this mode cannot do its job: the code is in the base, and deleting
a branch does not remove it. Reverting shipped behaviour is a change of its own,
with its own delta and its own review — not a flag. Report and stop.

**2. Commit whatever is loose, so the pin can cover it.**

```bash
git status --porcelain
git add -- <explicit paths> && git commit -m 'wip: work in progress at abandon'
```

Uncommitted work cannot be tagged, and step 4 would destroy it. Never `rm` an
uncommitted file and never discard one to "clean up" first: commit it onto the
branch that is about to be pinned, however unfinished it is.

**3. Pin every commit to the remote, and verify the pin.**

```bash
git tag -a -m 'Abandoned: <reason>' abandoned/<name>
git push origin abandoned/<name>
git ls-remote --tags origin 'refs/tags/abandoned/<name>'   # must print the SHA
```

Annotated, so the reason travels with the ref rather than living only in the
pull request that is about to be closed.

The tag is the survivor, and it is mandatory rather than a fallback. Everything
step 4 deletes — both branches, the change directory, the code — is reachable
from it afterwards:

```bash
git fetch origin 'refs/tags/abandoned/<name>:refs/tags/abandoned/<name>'
git checkout -b <name>-recovered abandoned/<name>
```

**If `git ls-remote` prints nothing, stop here.** Report that the work exists
only on this machine, name the SHA, and destroy nothing. A failed push is the one
condition that converts this command into a no-op — an unverified pin is the
`rescue/full-spike-work` state with a tag name on it.

**4. Destroy the work.**

```bash
gh pr close <n> --comment 'Abandoned: <reason>. Recoverable at tag abandoned/<name> (<SHA>).'
git checkout <base> && git pull --ff-only
git branch -D <name>                  # safe only because step 3 verified the tag
git push origin --delete <name>
```

The change directory and the implementation code go with the branch: they were
never on the base, so there is nothing left to remove from it. `-D` rather than
`-d` is deliberate and is the one place the verified tag is load-bearing.

If the change's code or its `openspec/changes/<name>/` directory did reach the
base — a shared branch, or a partial push — that part is **not** branch-deletable.
Revert it explicitly, in one commit, and say so in the report:

```bash
git revert --no-commit <first>..<last>
git rm -r openspec/changes/<name>
git commit -m 'revert(openspec): abandon <name>'
```

Never run `openspec archive` on an abandoned change. Archive applies the delta to
`openspec/specs/`, publishing an accepted requirement for a change nobody
accepted — and a spec describing behaviour no code implements passes every check
in this package, because none of them read application code.

**5. Report, plainly.** The abandoned name, the reason, the tag and its SHA, the
one-line recovery command above, the closed pull request, which branches were
deleted, and whether anything had to be reverted on the base.

## Never, in either mode

Destroy before `git ls-remote` has confirmed the tag on the remote. Force-push
the base. `rm` or discard an uncommitted file instead of committing it first.
`openspec archive` an abandoned delta. Delete a branch whose commits no remote
ref reaches — that is not abandoning work, it is losing it, and the two are told
apart by exactly one command.
