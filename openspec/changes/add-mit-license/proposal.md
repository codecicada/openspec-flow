# Proposal

- Add the MIT licence text as `LICENSE` at the repository root.
- The README's Licence section links to it.
- No behaviour changes, so the change skips specs.

## Why

`package.json` and `.claude-plugin/plugin.json` declare MIT, but the repository
has no licence file, so GitHub reports no licence. A reader checking the
showcase link takes that as "not open source".

## What Changes

- `LICENSE`: the standard MIT text, copyright 2026 Yannick Lescure.
- `README.md`: the Licence section points at `LICENSE`.

## Non-goals

- Changing the licence, or adding per-file headers.
- A release; the file ships with the next tag.

## Capabilities

### New Capabilities

### Modified Capabilities

None. `skip_specs: true`: a licence file is not system behaviour.

## Impact

`LICENSE`, `README.md`. npm includes `LICENSE` in the tarball whatever
`files` lists.
