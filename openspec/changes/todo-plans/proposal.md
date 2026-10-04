# Proposal

- Agents write proposed future changes to `todo/<slug>.md`.
- `/start-change` picks a matching plan up as its seed.
- Archive deletes the plan with the change it became.

## Why

A follow-up change an agent proposes dies with the transcript. Nothing on disk
can pick it up.

## What Changes

- `openspec-change-flow` skill: write a plan when proposing a future change.
- `/start-change`: match the description against `todo/*.md`; reuse the plan's slug.
- `/archive-on-green`: `git rm` the plan in the archive commit.
- Flow replies: no `bash` fence around a suggested slash command.

## Non-goals

- No hook or automatic transcript scan.
- `/stop-change --abandon` leaves the plan alone.

## Capabilities

### New Capabilities
- `deferred-change-plans`: plan files, their pickup and removal.
- `slash-command-suggestions`: presenting slash commands to the user.

### Modified Capabilities

## Impact

Two commands, one skill, the gates harness, `README.md`, `docs/change-flow.md`.
