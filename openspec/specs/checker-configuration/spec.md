# checker-configuration Specification

## Purpose
Defines which configuration file the spec checker reads from the repository
root, and how it reports a legacy or ignored file without changing the result.

## Requirements

### Requirement: Checker reads openspec-steward.json

The checker SHALL read its configuration from `openspec-steward.json` at the
repository root. A missing file SHALL mean an empty configuration, not an error.

#### Scenario: Current file present

- **WHEN** only `openspec-steward.json` exists and declares a deriver
- **THEN** the checker runs that deriver
- **AND** prints no configuration note

#### Scenario: No file present

- **WHEN** neither `openspec-steward.json` nor `openspec-flow.json` exists
- **THEN** the checker runs with no derivers
- **AND** prints no configuration note

### Requirement: Legacy openspec-flow.json is read with a note

When `openspec-steward.json` is absent and `openspec-flow.json` is present, the
checker SHALL read `openspec-flow.json` and print a note on stderr naming both
files and asking for the rename.

#### Scenario: Only the legacy file present

- **WHEN** only `openspec-flow.json` exists and declares a deriver
- **THEN** the checker runs that deriver
- **AND** stderr names `openspec-flow.json` as deprecated and `openspec-steward.json` as its replacement

### Requirement: Current file wins over the legacy file

When both files are present, the checker SHALL read only
`openspec-steward.json` and print a note on stderr naming `openspec-flow.json`
as ignored.

#### Scenario: Both files present

- **WHEN** `openspec-steward.json` and `openspec-flow.json` both exist with different derivers
- **THEN** the checker runs only the derivers in `openspec-steward.json`
- **AND** stderr names `openspec-flow.json` as ignored

### Requirement: Configuration notes do not change the exit code

A configuration note SHALL NOT change the checker's exit code or appear among
its findings.

#### Scenario: Legacy file on an otherwise clean repository

- **WHEN** only `openspec-flow.json` exists and every check passes
- **THEN** the checker exits 0
- **AND** the note appears on stderr only
