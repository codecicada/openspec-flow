# Proposal

- A `rules:` block holding every steward rule, plus its own, counts as set up.
- A block missing steward rules refuses, printing only what is missing.
- The `AGENTS.md` section becomes a pointer of at most seven lines.

## Why

On core-api, a hand-merged block that keeps the repo's own rules refuses
forever, since blocks compare as text, so `AGENTS.md` is never written. The
19-line section overflows a 40-line router `AGENTS.md`, and "merge is the only
gate" contradicts repos that gate apply, commit or archive.

## What Changes

- Containment check over block-style `rules:`.
- Pointer section that defers to the repo's approval rules.
- README states what init adds.

## Non-goals

- Writing into an existing `rules:` block.
- Editing core-api.
- A release.

## Capabilities

### New Capabilities

### Modified Capabilities
- `project-init`: containment; section size and gate wording.

## Impact

`scripts/init/lib/`, `commands/init.md`, `README.md`.
