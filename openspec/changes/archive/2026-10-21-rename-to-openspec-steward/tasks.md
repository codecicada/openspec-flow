# Tasks

## 1. Checker configuration

- [x] 1.1 Add `scripts/check-specs/lib/config.test.mjs` covering the four spec scenarios (current only, none, legacy only, both) over file contents; verify `npm test` fails because `lib/config.mjs` does not exist yet. Accept: the run errors on the missing module.
- [x] 1.2 Create `scripts/check-specs/lib/config.mjs` exporting the pure `selectConfig({ current, legacy })` returning `{ derivers, notes }`; verify `npm test` passes. Accept: all four scenarios green.
- [x] 1.3 In `scripts/check-specs/index.mjs`, read both files, call `selectConfig`, write each note to stderr, and point the deriver-not-found fix text at `openspec-steward.json`; verify `npm test` passes. Accept: `openspec-flow.json` appears in `index.mjs` only as the legacy path.
- [x] 1.4 Add smoke observation E to `scripts/check-specs/smoke-bin.sh`: a legacy `openspec-flow.json` on the passing fixture exits 0, stdout still reports all four checks passed, stderr carries the note; verify `npm run test:bin` passes. Accept: E reported ok.
- [x] 1.5 Watch the fallback fail: temporarily make `selectConfig` ignore `legacy`, confirm the legacy-only unit test fails, then restore; verify `npm test` is green again. Accept: one red run observed, then green.
- [x] 1.6 Update `scripts/check-specs/lib/README.md` to describe config selection and both file names; verify by reading it. Accept: no stale `openspec-flow.json`-only wording.

## 2. Plugin and package names

- [x] 2.1 Rename `name` in `.claude-plugin/plugin.json` and both names plus description in `.claude-plugin/marketplace.json` to `openspec-steward`; set `version` to `0.5.0` in `plugin.json`. Verify `claude plugin validate .` passes, or JSON parses with `node -e`. Accept: no `openspec-flow` left in `.claude-plugin/`.
- [x] 2.2 Set `name` to `openspec-steward` and `version` to `0.5.0` in `package.json`; verify `npm pack --dry-run` names `openspec-steward-0.5.0.tgz`. Accept: tarball name matches.
- [x] 2.3 Rename the CI header in `.github/workflows/ci.yml` and the smoke consumer name in `scripts/check-specs/smoke-bin.sh`; verify `npm run test:bin` passes. Accept: smoke test green.

## 3. Documentation

- [x] 3.1 Rename live mentions in `README.md`: title, install snippet (`codecicada/openspec-steward`, `ref` `v0.5.0`, key `openspec-steward@openspec-steward`), CLI install lines, and config file name. Verify `grep -n openspec-flow README.md` shows only the migration section. Accept: only migration lines match.
- [x] 3.2 Add a "Migrating from openspec-flow" section to `README.md`: the settings key edit, the config file rename, the fallback and its removal at 1.0. Verify the section names both config files and both plugin keys. Accept: section present.
- [x] 3.3 Rename live mentions in `docs/README.md`, `docs/checker.md`, `docs/design.md`, `docs/spec-drift.md`, and describe the fallback in `docs/checker.md`; verify `grep -rn openspec-flow docs/` prints only fallback mentions. Accept: no stale name.
- [x] 3.4 Confirm historical references stay: `git grep -n openspec-flow -- ':!openspec/changes/archive' ':!openspec/changes/rename-to-openspec-steward'` lists only the `#14` links, the quoted error, the fallback code, tests and migration docs. Accept: every hit is one of those.

## 4. Integration

- [x] 4.1 Run `npm test`, `npm run test:bin`, `npm run test:gates` and `node scripts/check-specs/index.mjs --root .`; verify all exit 0. Accept: four green runs.

## Workflow follow-up

- Open the PR, verify green by name against the head SHA, archive, verify the apply.
- After merge, the user renames `codecicada/openspec-flow` to `codecicada/openspec-steward` and pushes tag `v0.5.0`.
