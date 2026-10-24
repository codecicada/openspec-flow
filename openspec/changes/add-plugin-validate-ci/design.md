# Design

## Context

`claude plugin validate .` at this repository's root validates
`.claude-plugin/marketplace.json`, the plugin it points at, and skill
frontmatter. Run locally from `@anthropic-ai/claude-code@2.1.310` with an empty
`HOME` and an empty environment, it exits 0 on the tree with one warning
(`ICON_MISSING`). On broken copies it exits 1 for invalid `plugin.json` and
for skill frontmatter that does not parse. It exits 0 for invalid command
frontmatter, a skill with no `description`, a marketplace `source` that points
nowhere, and a marketplace entry whose name differs from `plugin.json`. See
proposal.md for why.

## Decision

1. A script, `scripts/plugin/validate.sh`, not inline workflow steps, so
   `npm run test:plugin` runs what CI runs. Same shape as `smoke-bin.sh`:
   observations that report and count rather than exit on the first miss.
2. The CLI is pinned (`@anthropic-ai/claude-code@2.1.310`) and installed into a
   temporary directory. A floating version could redden a build that changed
   nothing here, as the pinned `@fission-ai/openspec` in `smoke-bin.sh` already
   argues.
3. The validator runs with `HOME` pointed at an empty temporary directory and
   `ANTHROPIC_API_KEY` unset, locally as well as in CI. "Needs no credentials"
   is then observed on every run instead of assumed from the runner.
4. Three observations: the tree exits 0; a copy with invalid `plugin.json`
   exits 1 and names `plugin.json`; a copy with unparseable skill frontmatter
   exits 1 and names `frontmatter`. The two broken copies hold the pinned
   version to its claim: a later bump that stops checking turns this job red.
5. A separate job on Node 22, needing network for the install. Warnings do not
   fail it.

## Consequences

- A broken manifest or skill frontmatter fails CI before release.
- The job downloads the CLI on each run, the second job needing the registry.
- The checks the validator skips stay unchecked, and the job's comment says
  which.
- Bumping the pin is a deliberate commit, with the broken-copy observations as
  its test.

## Alternatives

- **Inline `npx` step.** Rejected: not runnable locally as one command, and no
  broken-copy check.
- **Floating `@latest`.** Rejected: an upstream release could change the result
  without a commit here.
- **Write our own manifest checks for what the validator skips.** Deferred: it
  duplicates a tool that moves with Claude Code. Revisit if one of those gaps
  causes a real breakage.
