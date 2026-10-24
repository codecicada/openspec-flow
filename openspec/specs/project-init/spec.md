# project-init Specification

## Purpose
Defines what the init command writes into a consumer repository's
`openspec/config.yaml` and root `AGENTS.md`, and when it refuses and writes
nothing.

## Requirements

### Requirement: Init requires an OpenSpec project

Init SHALL refuse, exit 1 and write nothing when `openspec/config.yaml` is
absent at the target root.

#### Scenario: No OpenSpec config

- **GIVEN** a repository with no `openspec/config.yaml`
- **WHEN** init runs
- **THEN** it exits 1 and its message names `openspec init`
- **AND** no file is created or changed, `AGENTS.md` included

### Requirement: Init adds the steward rules

Init SHALL append the steward `rules:` block to `openspec/config.yaml` when the
file has no top-level `rules:` key. The block SHALL equal the `rules:` block of
this repository's own `openspec/config.yaml`.

#### Scenario: Fresh config from openspec init

- **GIVEN** a `config.yaml` whose only `rules:` is inside a comment
- **WHEN** init runs
- **THEN** the file ends with the steward `rules:` block
- **AND** every byte before it is unchanged

#### Scenario: Rule text matches this repository

- **GIVEN** the rule text init writes
- **WHEN** it is compared with the `rules:` block of this repository's `openspec/config.yaml`
- **THEN** the two are identical

### Requirement: Init writes the flow section to AGENTS.md

Init SHALL keep one marked steward section in the root `AGENTS.md` of at most
seven lines, markers included, giving the binding order, `/start-change` and
`/stop-change`, that this repository's own approval rules also bind, and a link
to the flow. The section SHALL NOT repeat the rules. A begin marker with no end
marker after it SHALL refuse, exit 1 and write nothing.

#### Scenario: No AGENTS.md

- **GIVEN** no root `AGENTS.md`
- **WHEN** init runs
- **THEN** `AGENTS.md` is created holding only the marked section

#### Scenario: AGENTS.md without the section

- **GIVEN** an `AGENTS.md` with other content and no steward markers
- **WHEN** init runs
- **THEN** the marked section is appended
- **AND** the existing content is unchanged

#### Scenario: AGENTS.md with an outdated section

- **GIVEN** an `AGENTS.md` whose marked section differs from the current one
- **WHEN** init runs
- **THEN** only the text between the markers is replaced

#### Scenario: AGENTS.md with an unclosed section

- **GIVEN** an `AGENTS.md` with the steward begin marker and no end marker
- **WHEN** init runs
- **THEN** it exits 1 and its message names `AGENTS.md`
- **AND** neither `config.yaml` nor `AGENTS.md` changes

#### Scenario: Section fits a router AGENTS.md

- **GIVEN** the section init writes
- **WHEN** its lines are counted
- **THEN** there are at most seven
- **AND** it does not call merge the only gate

### Requirement: Init is idempotent

A second init run on its own output SHALL exit 0 and change no file.

#### Scenario: Run twice

- **GIVEN** a repository init has just set up
- **WHEN** init runs again
- **THEN** it exits 0
- **AND** `config.yaml` and `AGENTS.md` are byte-identical to before

### Requirement: Slash command runs init

`/openspec-steward:init` SHALL run init against the repository root and report
its output and exit status.

#### Scenario: Run from Claude Code

- **GIVEN** a repository with the plugin enabled
- **WHEN** the user runs `/openspec-steward:init`
- **THEN** init runs against the repository root
- **AND** its output and exit status are reported to the user

### Requirement: Rules holding the steward rules are left alone

Init SHALL leave `openspec/config.yaml` unchanged when its top-level `rules:`
block contains every steward item under its steward key, whatever other keys,
items or order it has. Items compare after trimming and dropping matching outer
quotes.

#### Scenario: Rules already present

- **GIVEN** a `config.yaml` carrying the steward `rules:` block
- **WHEN** init runs
- **THEN** `config.yaml` is byte-identical afterwards

#### Scenario: Steward rules plus the repository's own

- **GIVEN** a `rules:` block with every steward item, an extra `general:` key and an extra `tasks:` item
- **WHEN** init runs
- **THEN** it exits 0 and `config.yaml` is byte-identical afterwards
- **AND** `AGENTS.md` gains the marked section

### Requirement: Missing steward rules refuse

Init SHALL refuse, exit 1 and write nothing when a readable top-level `rules:`
block lacks any steward item, and SHALL print only the missing items under
their keys.

#### Scenario: Consumer has its own rules

- **GIVEN** a `rules:` block with a `tasks:` item of its own and no steward items
- **WHEN** init runs
- **THEN** it exits 1 and prints every steward item under its key
- **AND** neither `config.yaml` nor `AGENTS.md` changes

#### Scenario: Some steward rules missing

- **GIVEN** a `rules:` block with every steward item except the `design:` one
- **WHEN** init runs
- **THEN** it prints `design:` and its item, and no other steward item

#### Scenario: Adding the missing items passes

- **GIVEN** a refused block with the printed items added alongside its own
- **WHEN** init runs again
- **THEN** it exits 0

### Requirement: Unreadable rules refuse

Init SHALL refuse, exit 1 and write nothing when a top-level `rules:` block is
not block style, each key once with a `- item` list, and SHALL say so and
print the steward block.

#### Scenario: Flow-style rules

- **GIVEN** a `config.yaml` with `rules: { tasks: [Mine] }`
- **WHEN** init runs
- **THEN** it exits 1, its message says init reads block style only, and it prints the steward `rules:` block
- **AND** neither `config.yaml` nor `AGENTS.md` changes
