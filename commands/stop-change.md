---
name: stop-change
description: Stop the OpenSpec change flow for a named change — closing it if it reached its end, suspending it with a recorded resume point if it did not — or with --abandon destroy the change and its code, after pinning the commits to a verified remote tag.
---

Stop the flow for one named OpenSpec change. Take the name from the argument.

**Stopping just stops.** It does not judge whether the change is finished, and it
never merges, archives or implements anything to make the change look finished.
It ends the binding order established at `/start-change` and records where the
work stands, so nothing afterwards proceeds on green by itself.

Two modes:

- **no flag** — stop the flow. The change either *reached its end* (archived and
  merged: nothing is left to do, and the stop is final) or it did not (the stop
  **suspends** it, and `/start-change <name>` resumes it later).
- **`--abandon`** — the change is being given up. Destroy it: the proposal, the
  code, the branch and the pull request. Pin the commits to a remote tag first,
  and verify the pin before deleting anything.

`--abandon` refuses without an explicit name. Every other step here reads or
records state; this one deletes branches and code, and inferring *which* change
from `openspec list` is how the wrong work gets destroyed.

Neither mode merges anything. Merge is still the gate, and still the human's.

## Stopping the flow

**1. Read where the change actually stands.** Do not take the request as
evidence of a state; the whole point of a stop is that it can happen anywhere.

```bash
find openspec/changes -mindepth 1 -maxdepth 1 -type d -name '<name>'   # unarchived?
ls -d openspec/changes/archive/*<name>* 2>/dev/null                    # archived?
git log --oneline @{upstream}..HEAD                                    # anything local only?
gh pr view <n> --json number,state,mergedAt,mergeStateStatus
```

**2. Push anything that exists only here.** A resume point that lives on one
machine is the `rescue/full-spike-work` failure in slow motion: the flow stops,
the laptop is closed, and the change can only be picked up where it was left.
Push before recording the stop, and if pushing is impossible say plainly that the
resume point is local, naming the SHA.

**3. Refuse a clean close when the pull request is merged and the delta is not
applied.**

```bash
git fetch -q origin
git merge-base --is-ancestor HEAD origin/<base> && \
  find openspec/changes -mindepth 1 -maxdepth 1 -type d -name '<name>'
```

Both true is the **inversion**: the code shipped while the specification still
describes it as proposed. Report it as a defect and say the remedy — archive now,
in its own pull request — rather than recording a tidy close over it.

This is the one refusal here with a receipt. In the session that produced this
command, a change was merged first and archived afterwards, in a second pull
request needing a second merge, inverting step 7 of `/archive-on-green` ("stop
before merging") and costing exactly the extra gate the one-gate design exists to
remove. Nothing refused it, because nothing was watching the order.

Note what this does **not** refuse: an unarchived change whose pull request is
still open. That is ordinary unfinished work, and stopping is allowed to leave it
unfinished. Only *merged* and unarchived is a defect.

**4. Record the stop where the resume can find it.**

For a stop **before `propose`** — no `openspec/changes/<name>/` on disk — there
is no change for `STOPPED.md` to live in, and creating the directory to hold it
would make an unproposed change read as proposed. Write no marker. Offer instead
to record the exploration as a deferred plan, `todo/<name>.md`, in the shape
`openspec-change-flow` gives under "Deferring a change": frontmatter `slug`,
`title`, `created`, `source`, and `Why`, `What` and `Open questions` drawn from
what explore found. Write it only on the user's yes:

```bash
git add -- todo/<name>.md
git commit -m 'chore(todo): defer <name>' -- todo/<name>.md
git push
```

On a no, write nothing and say so: nothing on disk records the work, and the
next `/start-change` for it is a fresh open that answers the gate again. If
explore already created `openspec/changes/<name>/` on the user's confirmation,
this is not a stop before `propose`: take the `STOPPED.md` path below.

For a change that reached its end — archived, merged — there is nothing to
resume. Report the close and stop. No marker is written, because a marker that
says "resume this" over finished work is worse than none.

Otherwise write the resume point into the change itself, commit it and push it:

```bash
cat > openspec/changes/<name>/STOPPED.md <<'EOF'
# Stopped

- **stopped**: <date>
- **reason**: <why the flow was stopped>
- **head**: <SHA>
- **branch**: <branch>
- **pr**: <number or "none">
- **next step**: <the step /start-change should resume at>
EOF
git add -- openspec/changes/<name>/STOPPED.md
git commit -m 'chore(openspec): stop <name>' -- openspec/changes/<name>/STOPPED.md
git push
```

A file rather than an inference, for the reason the checker uses markers at all:
intent is declared, never guessed. "There is a change directory and no session
open" is a guess, and it reads the same for a change stopped deliberately, a
change someone is mid-way through on another branch, and a change nobody has
touched in a month. `STOPPED.md` distinguishes them, travels with the branch,
shows up in the pull request, and is removed by the resume that consumes it.

**5. Report the stop.** The name, which outcome it was (closed, suspended, or
deferred to a plan before `propose`), the resume point if suspended, the plan
path if deferred, and one line saying the order no longer binds: nothing
about this change archives, merges or proceeds on green until `/start-change`
opens it again.

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

Leave `todo/<name>.md` alone. If the change started from a plan, the plan was on
the base before the change was opened, and abandon restores "never opened". If
the idea itself is dead, removing the plan is a separate commit someone decides
on. A plan written *on* the abandoned branch, for some other later change, goes
with the branch and survives at the tag.

Never run `openspec archive` on an abandoned change. Archive applies the delta to
`openspec/specs/`, publishing an accepted requirement for a change nobody
accepted — and a spec describing behaviour no code implements passes every check
in this package, because none of them read application code.

**5. Report, plainly.** The abandoned name, the reason, the tag and its SHA, the
one-line recovery command above, the closed pull request, which branches were
deleted, and whether anything had to be reverted on the base.

## Never, in any mode

Archive, merge or implement anything to make a stop look tidier than the state it
found. A stop reports what is there. Destroy before `git ls-remote` has confirmed
the tag on the remote. Force-push the base. `rm` or discard an uncommitted file instead of committing it first.
`openspec archive` an abandoned delta. Delete a branch whose commits no remote
ref reaches — that is not abandoning work, it is losing it, and the two are told
apart by exactly one command.
