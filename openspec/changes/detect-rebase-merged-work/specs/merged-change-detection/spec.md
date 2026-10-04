# Spec Delta

## Purpose

Decides whether a change has reached the base branch, independent of how its
pull request was merged, so the stop and abandon refusals rest on what shipped.

## ADDED Requirements

### Requirement: Merged is decided from the change directory in the base tree
A change SHALL be read as merged when the fetched `origin/<base>` tree contains
`openspec/changes/<name>/` or `openspec/changes/archive/*-<name>/`, and as
unmerged otherwise. Ancestry of the branch head SHALL NOT decide it.

#### Scenario: Merge commit
- **WHEN** the branch was merged with `--no-ff`
- **THEN** the change reads as merged

#### Scenario: Rebase merge
- **WHEN** the branch commits were replayed onto the base with new SHAs
- **THEN** the change reads as merged

#### Scenario: Squash merge
- **WHEN** the branch was squashed into one commit on the base
- **THEN** the change reads as merged

#### Scenario: Later base work on the same lines
- **WHEN** the change was merged and a later commit on the base edits the lines it changed
- **THEN** the change reads as merged

#### Scenario: Branch moved after the merge
- **WHEN** the change was merged and the branch gained a commit afterwards
- **THEN** the change reads as merged

#### Scenario: Unmerged branch
- **WHEN** the branch was pushed but never merged, whatever else landed on the base
- **THEN** the change reads as unmerged

#### Scenario: Merge reverted
- **WHEN** the merge was reverted on the base
- **THEN** the change reads as unmerged

### Requirement: The decision needs only git
Deciding merged SHALL need only git and a fetched `origin`, and SHALL NOT need
`gh`, network access beyond the fetch, or a pull request number.

#### Scenario: No pull request
- **WHEN** the change has no pull request
- **THEN** merged is still decided from the base tree

### Requirement: Inversion is the change still unarchived in the base
`/stop-change` SHALL refuse a clean close when `origin/<base>` contains
`openspec/changes/<name>/`, and SHALL close when it contains only
`openspec/changes/archive/*-<name>/`.

#### Scenario: Merged before archive
- **WHEN** the base contains `openspec/changes/<name>/`
- **THEN** stop reports the inversion and does not close

#### Scenario: Archive committed but not merged
- **WHEN** the branch archived the change after the merge, and that commit is not in the base
- **THEN** stop still reports the inversion

#### Scenario: Merged and archived
- **WHEN** the base contains `openspec/changes/archive/*-<name>/` and not `openspec/changes/<name>/`
- **THEN** stop closes the change

### Requirement: Abandon refuses a merged change
`/stop-change --abandon` SHALL refuse when the change reads as merged, by any
merge style, and SHALL proceed when it reads as unmerged.

#### Scenario: Rebase-merged change
- **WHEN** `--abandon` runs on a change that was rebase-merged
- **THEN** it refuses before pinning or deleting anything

#### Scenario: Reverted change
- **WHEN** `--abandon` runs on a change whose merge was reverted on the base
- **THEN** it proceeds
