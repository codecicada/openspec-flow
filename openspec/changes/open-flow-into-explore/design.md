# Design

## Context

The flow order appears in three places. `skills/openspec-change-flow/SKILL.md:12`
and `docs/change-flow.md:20` already put `opsx explore` first.
`commands/start-change.md` step 6 does not, and the command only states the
order; nothing enters the first step. Nothing is written under
`openspec/changes/<name>/` until `propose`, so a stop during explore has no
directory for `STOPPED.md`. See proposal.md for why.

## Decision

1. Step 6 states the explore-first order, then enters explore on a fresh open,
   with the description as its input. On a resume it enters the recorded next
   step instead.
2. Explore at opening is described as writing no code and opening no change,
   with its findings seeding `propose`. It is not described as writing nothing:
   `openspec-explore` may create change artifacts on the user's confirmation.
3. `/stop-change` step 4 branches on disk: no `openspec/changes/<name>/` means
   a stop before `propose`, which offers `todo/<name>.md` using the existing
   deferred-plan shape and commit rule. A directory present means the
   existing `STOPPED.md` path, even if explore created it.
4. No gate checks the order string. `slash-command-suggestions` sets the
   precedent: a behavioral spec held by review.

## Consequences

- The command, skill and docs state one order.
- Opening and explore happen in one turn, so explore cannot be skipped by
  omission.
- A stop before `propose` leaves either a plan or, on a decline, nothing; the
  next `/start-change` is a fresh open and answers the gate again.
- Order drift between the three files is caught by review only.

## Alternatives

- **State the order only, user runs `/opsx:explore`.** Rejected: the same
  omission that left explore out of step 6 can skip it.
- **Scaffold the change at opening, so `STOPPED.md` always has a home.**
  Rejected: it writes under `openspec/changes/` before `propose`, and a change
  directory with no proposal reads as proposed work.
- **Gate comparing the order string across files.** Rejected: brittle against
  rewording, so it mostly catches phrasing, not drift.
