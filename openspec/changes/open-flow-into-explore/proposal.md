# Proposal

- `/start-change` states the order with `explore` first.
- It then enters explore; a resume enters the recorded next step.
- A stop before `propose` defers the work to `todo/<slug>.md`.

## Why

`/start-change` step 6 states `propose -> apply -> ...`, omitting `explore`,
while the skill and docs put it first. Stating the order also leaves explore
skippable.

## What Changes

- `/start-change` step 6: explore-first order, then enter explore.
- `/stop-change`: before `propose`, offer a `todo/` plan, not `STOPPED.md`.
- `openspec-change-flow` skill and `docs/change-flow.md`: match.

## Non-goals

- No gate asserting the order string.
- Explore keeps its own write rules.

## Capabilities

### New Capabilities
- `change-flow-opening`: the order stated at opening and the step entered.

### Modified Capabilities
- `deferred-change-plans`: `/stop-change` before `propose` writes a plan.

## Impact

`commands/start-change.md`, `commands/stop-change.md`,
`skills/openspec-change-flow/SKILL.md`, `docs/change-flow.md`.
