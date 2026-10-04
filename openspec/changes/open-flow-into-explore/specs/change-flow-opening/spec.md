# Spec Delta

## Purpose

Fixes the order `/start-change` binds when it opens the flow, and the step it
enters first, so explore cannot be skipped on the way to propose.

## ADDED Requirements

### Requirement: Opening states the explore-first order
When `/start-change` opens the flow, fresh or resumed, it SHALL state the order
that binds until `/stop-change` as
`explore -> propose -> apply -> open PR -> verified green -> archive -> verify the apply -> merge on explicit request`.

#### Scenario: Fresh open
- **WHEN** `/start-change <description>` opens a fresh change
- **THEN** the stated order begins `explore -> propose`

#### Scenario: Resume
- **WHEN** `/start-change` resumes a suspended change
- **THEN** the stated order is the same, explore first

### Requirement: Fresh open enters explore
After recording a fresh opening, `/start-change` SHALL enter explore with the
description, without waiting for the user to run it.

#### Scenario: Fresh open continues into explore
- **WHEN** a fresh open passes every check
- **THEN** explore starts on the description in the same turn

#### Scenario: Refused open
- **WHEN** a check refuses the open
- **THEN** explore is not entered

### Requirement: Explore at opening produces evidence, not code
Explore entered by `/start-change` SHALL write no code. Its findings SHALL seed
`propose`. It SHALL NOT be described as writing nothing, since explore may
create change artifacts on the user's confirmation.

#### Scenario: Explore hands off to propose
- **WHEN** explore at opening concludes
- **THEN** its findings are the input `propose` starts from
- **AND** no file outside `openspec/changes/` has changed

### Requirement: Resume enters the recorded next step
On a resume, `/start-change` SHALL enter the next step recorded in `STOPPED.md`,
not explore, unless that step is explore.

#### Scenario: Stopped after apply began
- **WHEN** `STOPPED.md` records `apply` as the next step
- **THEN** the resume enters `apply`, not explore
