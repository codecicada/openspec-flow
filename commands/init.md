---
name: init
description: Set up this repository for the openspec-steward flow — add the steward artifact rules to openspec/config.yaml and a flow summary to the root AGENTS.md.
---

Run the init bin against the repository root, and report what it printed and
its exit status:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/init/index.mjs" --root "$(git rev-parse --show-toplevel)"
```

If the command still reads `${CLAUDE_PLUGIN_ROOT}` literally, the variable was
not substituted: say so and stop, rather than guessing the plugin's path.

- **Exit 0** — each file is either `updated` or `already set up`. Name which.
  Nothing is committed: the user decides that.
- **Exit 1** — init refused and wrote nothing. Show its message as printed.
  When it prints the expected `rules:` block, the repository already has rules
  of its own: do not merge them into `openspec/config.yaml` yourself. Which
  rules win is the user's call.

The rules themselves live in `openspec/config.yaml`; the `AGENTS.md` section
only points at them.
