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
  When it prints a `rules:` block, the repository has rules of its own that
  lack those steward items; adding them under their keys, next to its own
  rules, lets a rerun pass. Do not edit `openspec/config.yaml` yourself: which
  rules the repository keeps is the user's call.

The rules themselves live in `openspec/config.yaml`; the `AGENTS.md` section
only points at them.
