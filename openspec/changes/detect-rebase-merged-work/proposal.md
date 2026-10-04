# Proposal

- `/stop-change` decides "merged" by ancestry, which rebase and squash merges defeat.
- Decide it instead by looking for the change's own directory in the base tree.
- Git only; the gates harness covers every merge style.

## Why

After yannicklescure/openspec-flow#14 was rebase-merged, the ancestry check said
"not merged". The inversion refusal and the `--abandon` refusal both miss
rebase- and squash-merged work.

## What Changes

- `/stop-change` step 3 and `--abandon` step 1: read
  `openspec/changes/<name>` or `openspec/changes/archive/*-<name>` in
  `origin/<base>`, not `git merge-base --is-ancestor`.
- Gates harness: `detect_merged` follows; add rebase, squash, revert and
  later-base-work cases in both directions.

## Non-goals

- No `gh` lookup of the pull request state.
- No content diff of the change's code paths.

## Capabilities

### New Capabilities
- `merged-change-detection`: deciding whether a change reached the base.

### Modified Capabilities

## Impact

`commands/stop-change.md`, `scripts/gates/refusal-cases.sh`, the skill and
`docs/change-flow.md` where they restate the check.
