# Spec Delta

## Purpose

Keeps a change that an agent proposes for later on disk as a plan file, so a
later `/start-change` can pick it up and the archive of that change removes it.

## ADDED Requirements

### Requirement: Plan file location and shape
A deferred change SHALL be recorded as `todo/<slug>.md` at the repository root,
with frontmatter `slug`, `title`, `created` and `source`, and a body with `Why`,
`What` and `Open questions` sections. The file name SHALL equal the `slug` field.

#### Scenario: Well-formed plan
- **WHEN** an agent records a deferred change with slug `add-widget-caching`
- **THEN** `todo/add-widget-caching.md` exists
- **AND** its frontmatter `slug` is `add-widget-caching`
- **AND** its body has `Why`, `What` and `Open questions` headings

#### Scenario: Plan is not a proposal
- **WHEN** a plan file is written
- **THEN** nothing is created under `openspec/changes/`

### Requirement: Agent writes a plan when it proposes a future change
An agent following the change flow SHALL write a plan file when it recommends a
specific change for later instead of doing it now, SHALL commit it by explicit
path, and SHALL tell the user the path.

#### Scenario: Follow-up proposed mid-change
- **WHEN** an agent working on one change recommends a separate change for later
- **THEN** it writes `todo/<slug>.md`
- **AND** commits it with `git add -- todo/<slug>.md`, never a directory add
- **AND** names the path in its reply

#### Scenario: Passing idea
- **WHEN** an agent mentions an idea without recommending it as a change
- **THEN** no plan file is written

### Requirement: Plan slug is unique
A new plan's slug SHALL NOT match an existing plan, an active change, or an
archived change.

#### Scenario: Slug already planned
- **WHEN** `todo/<slug>.md` already exists for different work
- **THEN** the agent picks a different slug

#### Scenario: Same work already planned
- **WHEN** `todo/<slug>.md` already describes the same work
- **THEN** the agent updates that plan instead of writing a second one

#### Scenario: Slug already archived
- **WHEN** `openspec/changes/archive/` holds a folder ending in `-<slug>`
- **THEN** the agent picks a different slug

### Requirement: Start picks up a matching plan
`/start-change` SHALL look for a plan the description matches before minting a
new slug, and on a match SHALL use the plan's slug and seed the proposal from
the plan.

#### Scenario: Description is the plan slug
- **WHEN** `/start-change add-widget-caching` runs and `todo/add-widget-caching.md` exists
- **THEN** the change slug is `add-widget-caching`
- **AND** the report names the plan as the seed

#### Scenario: Description plainly matches one plan
- **WHEN** the description plainly describes the work in exactly one plan
- **THEN** that plan's slug is used

#### Scenario: Ambiguous match
- **WHEN** the description might match one or more plans
- **THEN** the command names the candidate plans and asks, without choosing

#### Scenario: Plan does not bypass the gate
- **WHEN** a plan is picked up on a fresh open
- **THEN** "does this deserve a change?" is still answered out loud

### Requirement: Archive removes the plan
`/archive-on-green` SHALL delete `todo/<name>.md` in the archive commit when the
file exists, and SHALL proceed unchanged when it does not.

#### Scenario: Change started from a plan
- **WHEN** the change `<name>` is archived and `todo/<name>.md` is tracked
- **THEN** the archive commit removes `todo/<name>.md`

#### Scenario: Change without a plan
- **WHEN** the change `<name>` is archived and `todo/<name>.md` does not exist
- **THEN** the archive proceeds and reports no plan removed

#### Scenario: Abandon keeps the plan
- **WHEN** `/stop-change <name> --abandon` runs
- **THEN** `todo/<name>.md` is left as it is on the base
