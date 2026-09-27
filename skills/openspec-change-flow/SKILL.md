---
name: openspec-change-flow
description: The change flow for an OpenSpec repository — one human gate inside it, at merge, bracketed by an explicit start and stop. Use when running an OpenSpec change end to end — opening or resuming the flow, proposing, applying, opening a PR, watching CI, archiving, merging, stopping, suspending or abandoning — and whenever deciding whether a step needs the user's approval or whether CI green is the trigger.
version: 0.2.0
---

# The change flow

```
/start-change <name>            <- opens the flow, or resumes a suspended one
  opsx explore -> propose -> apply -> open PR -> watch CI
    on green: archive, then merge on explicit request
    on red:   fix, push, watch again
/stop-change <name>             <- stops the flow: closed if it reached its end,
                                   suspended (with a resume point) if it did not
/stop-change <name> --abandon   <- destroys the change and its code
```

**Merge is the only human gate *inside* the flow.** Between `/start-change` and
`/stop-change`, nothing stops to ask except merge.

Start and stop are not gates in that sense. They are **brackets**: they say
whether a change is in flight at all. A gate interrupts work that is under way; a
bracket marks where "under way" begins and ends. The distinction matters because
the argument for one gate was never about a count — see below.

## Why one gate

This is not laxity. A repository that stopped twice per change — once before
committing, once before archiving — shipped a day of changes and *neither
stop ever changed anything*. Reading back what each decision actually caught:

| decision | was it gated? | caught anything |
|---|---|---|
| does this deserve a change? | no | most of the time |
| is the implementation right? | yes | never |
| should this be archived? | yes | never |
| did I prove it or assume it? | no | every time |

Both gates sat on decisions nobody was making. The archive gate could not do
better: its commit applies a delta and moves a folder, so there is nothing in it
for a reader to judge. What it did instead was split one piece of work into two
states — after a change was committed and pushed, *"did you archive?"* had to be
asked, because neither party knew which state the work was in.

So: **gate where a decision lives.** The metric was never how many stops there
are; it was whether a decision lives at each one. Two of the four rows above are
decisions, and only one of them was gated.

## Why start and stop are not a third and fourth gate

Read the table again. The row that caught something most of the time — *does this
deserve a change?* — was never gated, and the row that caught something every
time — *did I prove it or assume it?* — is what `openspec-evidence` exists for.
`/start-change` puts the first of those where it belongs. It is the missing gate
the table already named, not a new one.

`/stop-change` is the opposite kind of thing. It adds no decision; it ends the
ambiguity the archive gate created. The archive gate's real defect was leaving
work in a state nobody could name, so *"did you archive?"* had to be asked. A
stop that refuses to close an unarchived change answers that question by
construction rather than by asking it.

Both are cheap in the currency that matters. The two removed gates cost a stop
**per change in flight**, twice each. Start and stop cost one call each at the
edges, and the steps between them never pause.

And the gap they close is real. With nothing marking the open, a change began
because an agent started behaving as though one had begun, and ended the same
way. In one session that produced a concrete error: the change was **merged
first and archived afterwards**, in a second pull request needing a second merge
— inverting step 7 of `/archive-on-green` ("stop before merging") and costing
exactly the extra gate the one-gate design exists to remove. The order was never
established as binding, because the flow was never explicitly opened.

## Opening or resuming the flow

`/start-change <name>` — see the command for the full procedure. Two ways in,
decided by what is on disk rather than by a flag:

- **Fresh** — nothing under `openspec/changes/<name>/`. "Does this deserve a
  change?" is answered out loud first.
- **Resume** — the change directory is there, with or without a `STOPPED.md`
  marker. The deserve-a-change question is **not** re-asked: it was answered when
  the change was opened, and asking again on every interruption is the
  twice-per-change flow this design rejected. Instead the recorded resume point
  is read, its head SHA is verified to still resolve, and the recorded next step
  is restated. A resume point naming a commit no ref reaches is a refusal.

Either way it refuses a dirty tree, a base that has moved, a name already in
`changes/archive/`, or a *different* second active change. Each refusal exists
because a later step would otherwise measure the wrong thing; the command says
which step, for each. A resume consumes its marker in the commit that resumes.

From the open until the stop, the order below binds. It is not advice, and the
archive is not optional afterwards.

## Archiving on green

Archive when CI is green, without asking again. **Green means every required
check reported success against the _current head SHA_, confirmed by name.**

```bash
SHA=$(gh pr view <n> --json headRefOid -q .headRefOid)
[ "$SHA" = "$(git rev-parse HEAD)" ] || exit 1   # head moved under you
gh api "repos/<owner>/<repo>/commits/$SHA/check-runs" \
  -q '.check_runs[] | "\(.conclusion // .status)\t\(.name)"' | sort
```

`gh pr checks --watch` **exits 0 when its head is replaced mid-watch**. Under a
manual archive that was a nuisance; with archiving triggered by green it is a
correctness bug — a stale pass would apply a delta against code CI never
accepted. An exit code is not evidence. Resolve the SHA, then check each result
against it.

The same hazard appears one layer up when polling: a poll that catches the API
before it registers runs for a new head sees the *old* head's passes. If checks
arrive all at once on the first poll rather than trickling in, suspect that.

## After archiving

Verify the apply rather than trusting it:

- the requirement is declared **once** (a doubled requirement is what
  hand-editing a main spec produces)
- a `MODIFIED` requirement still carries every scenario it had, plus any added
- for a `skip_specs` change, the specs tree is **byte-identical** — check a
  checksum, do not eyeball it
- `openspec validate --specs --strict` passes, and the capability count is what
  you expected

Then commit the archive and let CI run again. That second cycle is the one that
verifies the only thing the archive commit changed.

## Merging

Merge on explicit request, and verify green by name against the head SHA first —
including after the archive commit, which is a new head. If asked to merge while
checks are still running, say so and hold rather than merging an unverified head;
the instruction is about intent, not timing.

## Stopping the flow

`/stop-change <name>` **just stops**. It does not judge whether the change is
finished and never archives, merges or implements anything to make it look
finished. Two outcomes, decided by the state it finds:

- **Closed** — archived and merged. Nothing to resume, no marker written.
- **Suspended** — anything else. The resume point is written to
  `openspec/changes/<name>/STOPPED.md` (reason, head SHA, branch, PR, next step),
  committed and pushed, and `/start-change <name>` picks it up later.

A marker rather than an inference, for the reason the checker uses markers at
all: intent is declared, never guessed. "A change directory with no session open"
reads identically for a change stopped deliberately, one being worked on another
branch, and one nobody has touched in a month.

The one thing a stop refuses is a **clean close over the inversion**: a merged
pull request whose delta is still unapplied is reported as the defect it is, with
"archive now" as the remedy, rather than recorded as tidy. An unarchived change
whose PR is still open is not refused — that is ordinary unfinished work, and
stopping is allowed to leave work unfinished.

Anything that exists only on this machine is pushed before the stop is recorded.
A resume point on one laptop is the `rescue/full-spike-work` failure in slow
motion.

`/stop-change <name> --abandon` **destroys** a change: the proposal, the
implementation code, the branch and the pull request all leave the working
repository, which ends up as though the change had never been opened.

It is destructive by design and must never be *silently* destructive, so it is
ordered **pin, verify the pin, then destroy**. Every commit — including anything
loose, committed first rather than discarded — is pinned to `abandoned/<name>` on
the remote, and `git ls-remote` must print that tag's SHA **before** anything is
deleted. A push that cannot be verified turns the whole command into a no-op that
reports the SHA and deletes nothing.

That one command is what separates abandoning work from losing it. A spike in the
consumer repository survived as six commits on a local branch and nothing else —
no remote, no pull request, no tag — so recovering it needed the machine it was
written on. The tag is why `git branch -D` and `git push origin --delete` are
safe here; without it they produce exactly that state.

Never `openspec archive` an abandoned change: archive applies the delta to
`openspec/specs/`, publishing an accepted requirement for a change nobody
accepted.

Already-merged work cannot be abandoned — deleting a branch does not remove code
that is already in the base. Reverting shipped behaviour is a change of its own,
with its own delta and its own review.

## Staging

Stage **explicit paths**, never `git add <dir>`. A directory add sweeps in
unrelated in-flight change folders, which is easy to do and easy to miss — it
happened, and was caught only by reading the commit's own file list afterwards.
