# Design

## Context

`readConfig` lives in `scripts/check-specs/index.mjs` and reads one hard-coded
path, `openspec-flow.json`. Every unit test imports a module under `lib/`, so
nothing tests `readConfig` today. The plugin name appears in
`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`,
`package.json`, the README, `docs/`, the `ci.yml` header and the smoke test's
consumer name. A few references are history: the `yannicklescure/openspec-flow#14`
links in `commands/stop-change.md` and `scripts/gates/refusal-cases.sh`, and the
quoted `/openspec-flow:start-change` error in
`skills/openspec-change-flow/SKILL.md`. See proposal.md for why.

## Decision

1. Move config resolution to `scripts/check-specs/lib/config.mjs`, exporting
   `readConfig(root, { warn })`. `warn` defaults to writing to stderr and is
   injected in tests, the same seam `report()` uses with `write`.
2. Order: `openspec-steward.json`, then `openspec-flow.json` with a deprecation
   note. With both present, the current file wins, the legacy file is not
   parsed, and a note names it as ignored.
3. Notes go through `warn` only. They are never findings and never touch the
   exit code, so a consumer mid-migration stays green.
4. Rename every live mention. Historical references and archived changes keep
   the old name: they describe what was true then, and GitHub redirects the old
   repository URLs.
5. Release as v0.5.0. Changing the `enabledPlugins` key breaks an upgrade, and
   the project is pre-1.0, so a minor bump marks it. Consumers pinned to older
   tags keep the old manifests and are unaffected.
6. The legacy fallback is removed at 1.0.

## Consequences

- An existing consumer's inventory check keeps running after upgrading, with
  one stderr line telling them to rename the file.
- `readConfig` gains unit tests; the fallback is watched failing before it is
  trusted.
- Upgrading needs a one-time edit to the consumer's `.claude/settings.json`;
  the README's migration section says which.
- The version bump lands in this change, not a separate release PR: the
  install snippet's new plugin key is only valid at a tag carrying the new
  manifests. The snippet names `codecicada/openspec-steward` at `v0.5.0`;
  both resolve once the repository is renamed and the tag pushed after merge.

## Alternatives

- **Hard switch to `openspec-steward.json`.** Rejected: a consumer that missed
  the rename would lose its inventory check silently, which reads as no drift.
- **Fail when both files exist.** Rejected: it breaks a consumer partway
  through migrating, for a state that has one obvious resolution.
- **Keep the plugin name, rename only the npm package.** Rejected: the
  showcase entry and install key would still carry a name someone else owns.
