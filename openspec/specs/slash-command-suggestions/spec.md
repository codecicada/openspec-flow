# slash-command-suggestions Specification

## Purpose
Keeps a slash command that a flow step suggests to the user from being run as a
shell command, where it fails and leaves the flow half-started.

## Requirements

### Requirement: Suggested slash commands are not shell blocks
When a flow command or skill tells the user to run a slash command, the agent
SHALL present it as inline code or in an untagged fence. It SHALL NOT present
it in a fence tagged `bash`, `sh`, `zsh`, `shell` or `console`.

#### Scenario: Refusal asks the user to rerun
- **WHEN** `/start-change` refuses and suggests `/start-change <description>`
- **THEN** the suggestion is inline code or an untagged fence

#### Scenario: Plan written for later
- **WHEN** an agent writes `todo/<slug>.md` and tells the user how to pick it up
- **THEN** `/start-change <slug>` appears as inline code or in an untagged fence

#### Scenario: Shell commands keep their tag
- **WHEN** a flow step gives the user a git or `gh` command to run
- **THEN** that command may use a `bash` fence
