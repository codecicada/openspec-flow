# Spec Delta

## ADDED Requirements

### Requirement: Stop before propose offers a plan
When `/stop-change <name>` runs and `openspec/changes/<name>/` does not exist,
it SHALL NOT write `STOPPED.md`. It SHALL offer to record the explored work as
`todo/<name>.md`, and write it only on the user's yes.

#### Scenario: Stop during explore, user accepts
- **WHEN** `/stop-change <name>` runs before `propose` and the user accepts
- **THEN** `todo/<name>.md` is written with `Why`, `What` and `Open questions` from the exploration
- **AND** it is committed with `git add -- todo/<name>.md`
- **AND** no `STOPPED.md` is written

#### Scenario: Stop during explore, user declines
- **WHEN** `/stop-change <name>` runs before `propose` and the user declines
- **THEN** nothing is written
- **AND** the report says nothing on disk records the work

#### Scenario: Explore already captured the change
- **WHEN** explore scaffolded `openspec/changes/<name>/` before the stop
- **THEN** `/stop-change` writes `STOPPED.md` as for any suspended change
