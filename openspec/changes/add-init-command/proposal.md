# Proposal

- New `openspec-steward-init` bin writes steward's artifact rules into `openspec/config.yaml`.
- It also writes a marked flow summary into the root `AGENTS.md`.
- `/openspec-steward:init` runs the bin from Claude Code.

## Why

Adopting steward's rules is a hand edit, and agents other than Claude never
see the flow, because they read `AGENTS.md`, not plugin skills.

## What Changes

- New bin and slash command, idempotent, all-or-nothing.
- Differing existing `rules:` refuses with the expected block.

## Non-goals

- Custom rule text or per-artifact merging.
- Editing `CLAUDE.md` or running `openspec init`.
- A release; versioning stays separate.

## Capabilities

### New Capabilities
- `project-init`: what init writes, and when it refuses.

### Modified Capabilities

## Impact

`scripts/init/`, `scripts/check-specs/run-tests.sh`,
`scripts/check-specs/smoke-bin.sh`, `commands/init.md`, `package.json`,
`README.md`.
