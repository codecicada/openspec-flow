# Design

## Context

`claude plugin validate .` at this repository's root validates
`.claude-plugin/marketplace.json`, the plugin it points at, and skill
and command frontmatter. Run locally from `@anthropic-ai/claude-code@2.1.310`
with an empty `HOME` and an empty environment, it exits 0 on the tree with one
advisory warning (`ICON_MISSING`). Plain, it exits 1 only for invalid
`plugin.json` or frontmatter that fails to parse; missing frontmatter and a
skill with no `description` are warnings. With `--strict` those, and an unknown
`plugin.json` field, exit 1 too, while the icon advice stays a warning. Neither
mode checks a marketplace `source` that points nowhere or a marketplace entry
whose name differs from `plugin.json`. See proposal.md for why.

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
4. Run with `--strict`: a skill without frontmatter loads with empty metadata
   and never triggers, which is a defect, not advice.
5. Four observations: the tree exits 0; a copy with invalid `plugin.json`
   exits 1 naming it; a copy whose skill lost its frontmatter exits 1 (only
   under `--strict`, so it proves the flag is in force); a copy with
   unparseable command frontmatter exits 1 (commands are read). The broken
   copies hold the pinned version to its claim: a later bump that stops
   checking turns this job red.
6. A separate job on Node 22, needing network for the install.

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
