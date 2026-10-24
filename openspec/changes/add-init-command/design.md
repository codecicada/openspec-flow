# Design

## Context

`openspec init` (1.14.3) writes `openspec/config.yaml` with `rules:` only inside
a `# Example:` comment, and never touches `AGENTS.md`. `openspec config` edits
global settings only, so no OpenSpec command edits a project's config. The
package has no dependencies, so no YAML parser. `scripts/check-specs/` splits
pure `lib/` modules, unit-tested over text, from an `index.mjs` that owns disk
I/O and guards its entry through `realpathSync`, because npm installs a bin as a
symlink. `run-tests.sh` finds tests only under `scripts/check-specs/`. No
command in `commands/` runs a plugin script yet. See proposal.md for why.

## Decision

1. **Hybrid.** `scripts/init/index.mjs`, published as bin
   `openspec-steward-init`, does all writing; `--root <dir>` defaults to the
   working directory. `commands/init.md` runs
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/init/index.mjs" --root <repo root>` and
   reports output and exit status.
2. **Pure plan, then writes.** `scripts/init/lib/init.mjs` exports
   `planInit({ config, agents })` over file contents (`null` when absent),
   returning either `{ refusal }` or `{ writes }` with the new text per file.
   `index.mjs` reads both files, plans, and writes only when there is no
   refusal. That is what makes a refusal write nothing.
3. **Textual `rules:` detection.** A top-level key is a line starting `rules:`
   at column 0. Its block runs to the next non-blank line at column 0. Blocks
   compare after trimming trailing whitespace. Absent: append after one blank
   line, adding a final newline first if missing. Equal: no write. Different:
   refuse and print the expected block.
4. **Rule text lives in `scripts/init/lib/rules.mjs`.** A unit test extracts
   this repository's own `rules:` block with the same detection and asserts
   equality, so the shipped text cannot drift from the rules this repo uses.
5. **AGENTS.md section** sits between `<!-- openspec-steward:begin -->` and
   `<!-- openspec-steward:end -->`. Absent file: create it with the section.
   No markers: append after one blank line. Markers: replace what lies between
   them. The text states the binding order, `/start-change` and
   `/stop-change`, archive before merge, and merge as the only gate.
6. **Entry guard** copies `check-specs`' `realpathSync` comparison.
7. **Tests.** `run-tests.sh` searches `scripts/` instead of
   `scripts/check-specs/`, so `scripts/init/lib/*.test.mjs` runs under
   `npm test`. `smoke-bin.sh` gains observation F: the installed
   `openspec-steward-init` adds rules to a fresh fixture and exits 0.

## Consequences

- Every refusal and no-op is a unit test over strings; no agent judgment edits
  YAML.
- Agents other than Claude get the flow through `AGENTS.md`, and can run the
  bin themselves.
- A consumer with its own rules must merge by hand; the printed block is what
  they merge.
- `config.yaml` is written before `AGENTS.md`; a disk error between the two
  leaves the first written. A rerun completes it, since both steps are
  idempotent.
- Flow-style `rules: {...}` at column 0 is compared as text, so it refuses
  unless identical. A `rules:` nested under another key is not top-level and
  not OpenSpec's, so init still appends a top-level block.
- Risk: `${CLAUDE_PLUGIN_ROOT}` may not expand in command markdown. Apply
  checks it first; if it does not, the command resolves the plugin root from
  the command file's own path, and this design is updated before going on.
- The README install snippet pins `v0.5.0`, which lacks init. Init docs land
  now; the snippet moves at the next release.

## Alternatives

- **Slash command only.** Matches `start-change`, but YAML edits become agent
  judgment, which no test can hold.
- **Bin only.** Testable, but no `/openspec-steward:init` in Claude Code.
- **Per-artifact merge, or `--force`.** Merging hand-written YAML as text risks
  silent corruption; `--force` discards the consumer's own rules.
- **A YAML parser dependency.** Correct parsing, but it ends the package's zero
  dependencies and still loses comments on rewrite.
- **Reading rules from this repo's `openspec/` at run time.** `openspec/` is
  not in the package's `files`, so an npm install would not have it.
