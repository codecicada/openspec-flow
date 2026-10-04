# Design

## Context

The flow's commands and skills are prose instructions to an agent. There is no
runtime. The only executable checks are `scripts/check-specs/` and
`scripts/gates/refusal-cases.sh`. The gates harness shows each detection command
reads differently in the refusing state and the permitting one. `/start-change`
already matches a description against `openspec/changes/*` before it mints a
slug. `/archive-on-green` commits by explicit path. See proposal.md for why.

## Decision

1. **Trigger is a skill instruction, not a hook.** `openspec-change-flow` gets a
   "Deferring a change" section. The threshold: the agent recommends a specific
   change for later. A mention or a speculation does not count.
2. **Plan lives in git, at `todo/<slug>.md`.** The agent commits it by explicit
   path with `chore(todo): defer <slug>`. Mid-change, it goes in that change's
   branch and reaches the base with that PR. Outside a flow, the agent commits
   it on the current branch. `/start-change` refuses a dirty tree, so an
   uncommitted plan blocks the next open, which is the intended pressure.
3. **The plan's slug becomes the change slug.** The archive then finds the plan
   by name, with no link field to keep in sync. `/start-change` step 0 lists
   `todo/*.md` beside the active changes. It uses the same rule: exact slug or
   plain match uses it; "might be" asks.
4. **Archive removes with `git rm --ignore-unmatch -- todo/<name>.md`.** The
   command exits 0 whether the plan exists or not, so a change with no plan
   needs no branch. The removal is staged in the archive commit's explicit path
   list.
5. **Abandon does not touch `todo/`.** Abandon restores the repository to "never
   opened", and the plan existed before the open.
6. **The harness observes the new detections.** It covers plan present or
   absent for a slug, the archive removal staging the path, and no error when
   the plan is absent.
7. **A suggested slash command is never in a shell fence.** The desktop app
   adds a Run button to `bash`-tagged blocks. A slash command run that way
   fails in the shell: `zsh: no such file or directory: /openspec-flow:start-change`.
   The flow is then half-started, and the agent is tempted to go on as though
   the command had run. The rule goes in the skill, which every flow step
   loads. The harness scans `commands/`, `skills/`, `docs/` and `README.md`
   for a line in a shell-tagged fence that is a slash command.

## Consequences

- Plans committed mid-change reach the base only when that change merges. A
  plan written on a branch that is later abandoned is lost with the branch,
  although the `abandoned/<name>` tag keeps it.
- Every plan costs one commit. That is the price of the pickup surviving a
  machine change.
- Whether an agent writes a plan at the right moment is a judgment. The harness
  cannot observe it. It is listed in the harness's "not demonstrated" note.
- [Risk] Plans pile up and go stale. Mitigation: plans are visible in one
  directory. Pruning is a plain `git rm` and needs no tooling yet.

## Alternatives

- **Hook on transcript text.** Rejected: cannot tell a recommendation from a
  discussion. False positives would fill `todo/` with noise.
- **Plan as a proposed OpenSpec change (`openspec/changes/<slug>/`).** Rejected:
  it breaks start-change step 5 (one active change) and
  `/archive-on-green`'s single-change inference.
- **Plan outside git (`.claude/`, scratch).** Rejected: it does not survive a
  machine change or reach another agent.
- **Rule in each command file instead of the skill.** Rejected: five copies
  drift, and a reply outside any command would not see it.
- **Link field in the proposal pointing at the plan.** Rejected: it is a second
  name for the same thing. Slug equality gives the link for free.
