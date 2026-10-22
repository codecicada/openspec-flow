# Proposal

- The plugin, marketplace and package become `openspec-steward`.
- The checker reads `openspec-steward.json`, falling back to `openspec-flow.json`.
- Released as v0.5.0 with a migration note.

## Why

The npm name `openspec-flow` belongs to an unrelated package, so the name
cannot travel with the plugin to the OpenSpec community showcase.

## What Changes

- **BREAKING** `openspec-flow@openspec-flow` becomes
  `openspec-steward@openspec-steward`; consumers edit `enabledPlugins` once.
- Checker config: new name first, legacy name with a stderr note.
- README, `docs/`, manifests, CI and smoke test use the new name.

## Non-goals

- Renaming the GitHub repository (done by hand after merge).
- Rewriting archived changes or historical references.
- Renaming skills, commands or the `openspec-check-specs` bin.

## Capabilities

### New Capabilities
- `checker-configuration`: which config file the checker reads, and what it reports.

### Modified Capabilities

## Impact

`.claude-plugin/`, `package.json`, `scripts/check-specs/`, `README.md`,
`docs/`, `.github/workflows/ci.yml`.
