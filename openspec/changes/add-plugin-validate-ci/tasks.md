# Tasks

## 1. Validation script

- [ ] 1.1 Create `scripts/plugin/validate.sh`: install the pinned CLI into a temp dir, run `plugin validate` with an empty `HOME` and no `ANTHROPIC_API_KEY`, and make observations A (tree exits 0), B (invalid `plugin.json` exits 1, names it), C (unparseable skill frontmatter exits 1, names it); verify `sh scripts/plugin/validate.sh` prints three ok lines. Accept: exit 0, three ok.
- [ ] 1.2 Add `"test:plugin": "sh scripts/plugin/validate.sh"` to `package.json`; verify `npm run test:plugin` exits 0. Accept: same three ok lines.
- [ ] 1.3 Watch it fail: temporarily make the B mutation a no-op, confirm B reports FAIL and the script exits 1, then restore; verify green again. Accept: one red run observed, then green.

## 2. CI and docs

- [ ] 2.1 Add a `plugin validate` job to `.github/workflows/ci.yml` on Node 22 running the script, with a comment on what it covers and skips; update the header's "only the package half" sentence. Verify the YAML parses (`node -e` with a YAML-free check: `grep -c 'name: plugin validate'`). Accept: one job named `plugin validate`.
- [ ] 2.2 Update `README.md` ("Developing this package") and `docs/README.md` (CI line) to list the fourth suite; verify `grep -n 'test:plugin' README.md` and the CI line name it. Accept: both mention it.

## 3. Integration

- [ ] 3.1 Run `npm test`, `npm run test:bin`, `npm run test:gates`, `npm run test:plugin` and `node scripts/check-specs/index.mjs --root .`; verify all exit 0. Accept: five green runs.

## Workflow follow-up

- Open the PR, verify green by name against the head SHA (including `plugin validate`), archive, verify the apply.
- After merge, the user adds `plugin validate` to the required checks of the `protect master branch` ruleset.
