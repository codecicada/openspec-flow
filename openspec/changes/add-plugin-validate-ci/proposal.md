# Proposal

- A CI job runs `claude plugin validate --strict .` with a pinned Claude Code CLI.
- It also watches the validator fail on three broken copies.
- It needs no credentials; the script runs the same way locally.

## Why

No test reads the plugin manifests or skill frontmatter. A broken one passes
CI and fails only when a consumer installs the plugin.

## What Changes

- `scripts/plugin/validate.sh` (`npm run test:plugin`): the real tree passes;
  copies with invalid `plugin.json`, a skill without frontmatter, and
  unparseable command frontmatter each fail.
- `ci.yml`: a `plugin validate` job running it.
- README, `docs/README.md`: list the fourth suite.

## Non-goals

- Checking the marketplace `source` path or marketplace/plugin name agreement,
  which the validator does not check.
- Adding the job to the required checks (a manual ruleset edit).

## Capabilities

### New Capabilities

### Modified Capabilities

None. `skip_specs: true`: CI tooling, no system behaviour.

## Impact

`scripts/plugin/validate.sh`, `package.json`, `.github/workflows/ci.yml`,
`README.md`, `docs/README.md`.
