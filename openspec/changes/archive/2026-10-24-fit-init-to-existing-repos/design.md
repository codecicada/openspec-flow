# Design

## Context

`planInit` compares the existing `rules:` block with `STEWARD_RULES` as text
and refuses on any difference, telling the user to merge by hand and rerun. A
merge that keeps the repository's own rules is still different text, so the
rerun refuses again and `AGENTS.md` is never written. Reproduced with steward's
rules plus a `general:` list and an extra `tasks:` item: exit 1. core-api's real
block also lacks three steward rules (the TL;DR item, all of `design:` and
`specs:`), so it would refuse even under a fix, and needs to be told which.

core-api's `AGENTS.md` is a router capped at 40 lines, "pointers, never prose".
It is 31 lines; the current 19-line section plus its blank line makes 51. It
also says no apply, commit or archive happens without approval, which the
section's "Merge is the only gate" contradicts. See proposal.md for why.

## Decision

1. **Containment, not equality.** `parseRules(block)` in `rules.mjs` reads a
   block-style `rules:` into artifact key -> items: `rules:` alone on its line,
   keys at one indentation as `key:`, items deeper as `- item`, blank and `#`
   lines skipped. An item is compared after trimming and dropping one pair of
   matching outer quotes. Anything else (flow style, nested maps, continuation
   lines, a second key indentation, a key twice, which YAML would collapse)
   makes the block unreadable: `null`.
2. **`missingRules(block)`** returns the steward items absent from the block,
   grouped by key, or `null` when unreadable. Order and extra keys or items do
   not matter.
3. **Three outcomes in `planInit`.** Nothing missing: config untouched, init
   goes on to `AGENTS.md`. Something missing: refuse, write nothing, print the
   missing items as a `rules:` snippet under their keys and say to add them
   alongside the repository's own. Unreadable: refuse, write nothing, say init
   reads only block-style keys with `- item` lists, and print `STEWARD_RULES`.
   Every message names a rerun that can pass.
4. **Pointer section.** `AGENTS_SECTION` is at most 7 lines, markers included:
   a heading, the order with `/start-change` and `/stop-change`, the rules in
   `openspec/config.yaml`, that this repository's own approval rules also bind,
   and a link to `docs/change-flow.md` on GitHub. A test pins the line cap and
   keeps `explore -> propose -> apply` on one line.
5. **Docs.** README's setup paragraph states the section's size, that a block
   holding the steward rules is accepted, and that merge-on-request is the
   flow's own gate, not a replacement for the repository's. `commands/init.md`
   says the refusal prints only what is missing.

## Consequences

- A hand-merge that keeps the repository's rules passes on rerun.
- Contradicting rules (a 500-word cap next to steward's 150) pass; init checks
  presence, not consistency.
- A `rules:` block in a style init cannot read refuses until rewritten in block
  style. Every block `openspec init` and core-api write is block style.
- Existing consumers with the old section get the short one on the next run,
  since the text between the markers is replaced.
- The link follows `master`, so it moves with the docs.

## Alternatives

- **Keep equality, reword the message.** Honest, but every repository with
  rules of its own never gets the `AGENTS.md` section.
- **`--skip-rules` flag.** A way past the refusal that also skips the check.
- **Writing missing items into the block.** Editing hand-written YAML as text
  risks silent corruption; rejected again, as in `add-init-command`.
- **Keep the prose section, document its size.** Leaves router `AGENTS.md`
  files over their caps.
