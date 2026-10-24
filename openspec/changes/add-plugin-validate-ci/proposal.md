# Proposal

- A CI job runs `claude plugin validate .` with a pinned Claude Code CLI.
- It also watches the validator fail on two broken copies.
- It needs no credentials; the script runs the same way locally.

## Why

No test reads the plugin manifests or skill frontmatter. A broken one passes
CI and fails only when a consumer installs the plugin.

## What Changes

- `scripts/plugin/validate.sh` (`npm run test:plugin`): the real tree passes;
  a copy with invalid `plugin.json`, and one with unparseable skill
  frontmatter, each fail.
- `ci.yml`: a `plugin validate` job running it.
- README, `docs/README.md`: list the fourth suite.

## Non-goals

- Checking command frontmatter or marketplace/plugin name agreement, which the
  validator does not check.
- Adding the job to the required checks (a manual ruleset edit).

## Capabilities

### New Capabilities

### Modified Capabilities

None. `skip_specs: true`: CI tooling, no system behaviour.

## Impact

`scripts/plugin/validate.sh`, `package.json`, `.github/workflows/ci.yml`,
`README.md`, `docs/README.md`.
