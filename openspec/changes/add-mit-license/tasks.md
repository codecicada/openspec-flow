# Tasks

## 1. Licence

- [x] 1.1 Add `LICENSE` with the standard MIT text, `Copyright (c) 2026 Yannick Lescure`; verify `npm pack --dry-run` lists `LICENSE`. Accept: `LICENSE` appears in the tarball contents.
- [x] 1.2 Point the `## Licence` section of `README.md` at `LICENSE`; verify by reading the section. Accept: it names MIT and links `LICENSE`.

## 2. Integration

- [x] 2.1 Run `npm test`, `npm run test:bin`, `npm run test:gates` and `node scripts/check-specs/index.mjs --root .`; verify all exit 0. Accept: four green runs.

## Workflow follow-up

- Open the PR, verify green by name against the head SHA, archive, verify the apply.
- After merge, confirm GitHub reports the licence as MIT (`gh repo view --json licenseInfo`).
