---
name: start-change
description: Open or resume the OpenSpec change flow for a named change — answer whether it deserves a change (or pick up a suspended one), verify the tree, base and name, then establish that the documented order binds until /stop-change.
---

Open the flow for one named OpenSpec change. Take the name from the argument and
**refuse without one**. Nothing is inferred here. A flow that can open itself is
the state this command exists to end: a change used to begin because an agent
started behaving as though one had begun, which left no moment at which the
order of the steps was established as binding.

Two ways in, decided by what is on disk rather than by a flag:

```bash
ls openspec/changes/<name>/STOPPED.md 2>/dev/null   # suspended by /stop-change
find openspec/changes -maxdepth 2 -type d -name '*<name>*'
```

- **fresh** — nothing under `openspec/changes/<name>/`. Step 1 applies in full.
- **resume** — the change directory is there. `/stop-change` suspended it, or an
  interruption left it. Step 1 is already answered; step 1R replaces it.

The checks in steps 2, 3 and 5 apply to both. A resume is not a shortcut past
them: the tree still has to be clean, the base still has to be current, and a
*different* change still must not be open.

**1. Fresh: answer the question out loud — does this deserve a change?**

This is the gate. It is the one decision in the flow that was never gated and
*caught something most of the time* — see `openspec-change-flow`. So it is
answered in words, before any check below runs: what the change is for, and what
would be true when it is done. If the answer is no, say so and stop. The checks
that follow do not decide that; they only refuse to open the flow in a state
where its later steps would measure the wrong thing.

**1R. Resume: read the resume point instead, and verify it is still reachable.**

Do not re-answer "does this deserve a change?" on a resume. It was answered when
the change was opened, and asking again turns every interruption into a second
gate — exactly the twice-per-change flow the one-gate design rejected.

```bash
cat openspec/changes/<name>/STOPPED.md       # reason, head SHA, branch, PR, next step
git cat-file -e <head SHA>^{commit}          # is the recorded head still here?
```

If `STOPPED.md` is absent, the change was interrupted rather than stopped: say so,
derive the state the way `/stop-change` step 1 does, and continue.

If the recorded head **cannot be resolved**, refuse. A resume point naming a
commit no ref reaches means the branch was deleted or the work never left another
machine, and continuing would silently reopen the flow on top of a different
state than the one that was stopped. Report the SHA, say where it was last seen
(the branch and pull request `STOPPED.md` names), and stop.

Then restate the recorded **next step** before doing anything else, and delete
the marker in the commit that resumes:

```bash
git rm -- openspec/changes/<name>/STOPPED.md
git commit -m 'chore(openspec): resume <name>' -- openspec/changes/<name>/STOPPED.md
```

The marker is consumed by the resume that acts on it. A `STOPPED.md` left behind
in a branch that is moving again says the opposite of the truth, and the next
reader believes it.

**2. Refuse a dirty tree.**

```bash
git status --porcelain
```

Anything printed is reported, and the flow does not open.

Earns its place because the flow stages explicit paths, never `git add <dir>` —
and that rule is load-bearing only when there is unrelated work in the tree for
a directory add to sweep in. Opening on a clean tree means every path that
appears afterwards belongs to this change, so the commit that closes it can be
read as its own file list. Pre-existing edits, committed or discarded *before*
the flow opens, are a decision someone makes knowingly. Swept into a change
commit, they are a decision nobody made.

**3. Refuse a base that is not the base CI will merge into.**

```bash
git fetch -q origin
git rev-list --count HEAD..origin/<base>
```

A non-zero count means the branch is behind. Merge the base first, then reopen.

Earns its place because delta specs are written against the live specs *as they
are on disk*. If the base has moved, the delta describes a requirement the merge
result will not have, and the `scenarios` check then compares the delta with a
spec nobody will ship: the check runs, passes, and measures the wrong thing.
That is the first kind of empty green in `openspec-evidence`, one layer up —
the comparison happened, against the wrong side.

**4. Refuse a name that has already been through the flow.**

```bash
find openspec/changes -maxdepth 2 -type d -name '*<name>*'
```

A hit under `openspec/changes/archive/` is a refusal: `openspec archive` names
the archived folder after the change, so a reused name makes the archive
ambiguous, and "was this applied?" can no longer be answered by looking.

A hit directly under `openspec/changes/` is **not** a refusal — it is the resume
above. What it *is* refused as is a **fresh** start: never propose over a change
directory that already exists, and never open a second change under a second
name for work that is already proposed. Resuming is the common case after a stop
or an interruption, and starting fresh on top of one is how two proposals for one
piece of work appear.

**5. Refuse a second concurrent change, unless told otherwise.**

```bash
find openspec/changes -mindepth 1 -maxdepth 1 -type d ! -name archive
```

Earns its place for two reasons, one mechanical and one historical.
`/archive-on-green` infers the change name from `openspec list` when exactly one
is active, and a second active change silently removes that. And a second open
change reintroduces the defect the archive gate produced: work split across
states nobody can name, so *"which change is this commit for?"* has to be asked.

Overridable on explicit instruction — two changes in flight is sometimes the
right call — but reported either way, and the override is recorded in step 6.

**6. Record the opening.**

Report the change name, whether this was a fresh open or a resume (and for a
resume, the recorded reason and next step), the branch, the base and its SHA, and
which checks passed, naming any that were overridden. Then state the order that
now binds until `/stop-change`:

```
propose -> apply -> open PR -> verified green -> archive -> verify the apply
  -> merge on explicit request
```

Archive comes **before** merge, and is not optional afterwards. Merge remains
the only gate inside the flow.

## Checks deliberately not here

- **Green CI on the base.** It would gate this change on someone else's red, at
  the moment least able to fix it, and a red base does not make a proposal wrong.
- **A pushed branch.** There is nothing to push at open. Pushing matters at
  abandon, which is where `/stop-change` checks it.
- **A `check-specs` run.** On a fresh open there is no delta yet, so it would
  pass with nothing to compare — a green that means nothing, which is worse than
  no check because it reads as reassurance. On a resume it is worth running, but
  as the first step of the work rather than as a condition of opening: a red
  checker is a reason to resume, not a reason to refuse to.
- **`openspec` resolvable.** A real precondition, but of the repository rather
  than of this change, and it already fails loudly at `propose`.
