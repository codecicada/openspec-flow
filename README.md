# openspec-steward

A Claude Code plugin for repositories using [OpenSpec](https://github.com/fission-ai/openspec):
a change flow with **one human gate inside it, at merge**, bracketed by an
explicit start and stop, plus drift checks that hold a specification to the code
it claims to describe.

It exists because both halves were learned the expensive way in one repository
and then could not travel. The reasoning is kept, not just the rules — a rule
without its reason gets "simplified" back out.

How the flow runs, why it has one gate and two brackets, and how the checker is
built — with diagrams — are in [`docs/`](docs/README.md).

## What's in it

**Skills** — the flow and the discipline:

| skill | covers |
|---|---|
| `openspec-change-flow` | the sequence, why one gate inside the brackets, archive-on-verified-green, the `gh pr checks --watch` false green, post-archive verification, deferring a change to `todo/` |
| `openspec-spec-drift` | what a `MODIFIED` delta silently deletes, both marker placement rules and why they are opposites, the doc-vs-spec asymmetry |
| `openspec-evidence` | watch a check fail before trusting it; three ways a green check means nothing |

**Commands** — the procedures:

| command | does |
|---|---|
| `/start-change <description>` | describe the work; it proposes a session title and a change slug, then opens the flow (or resumes one a stop suspended): does this deserve a change, is the tree clean, is the base current, is the slug free |
| `/archive-on-green` | pin the head SHA, confirm each check by name, archive, verify the apply |
| `/verify-green` | is this PR actually green, against its current head? |
| `/init` | set the repository up: the steward artifact rules in `openspec/config.yaml`, a flow summary in `AGENTS.md` |
| `/stop-change` | stop the flow: closed if the change reached its end, suspended with a recorded resume point if it did not; `--abandon` destroys it, code and all, after pinning the commits to a verified remote tag |

`/start-change` and `/stop-change` bracket the flow, and the brackets nest in
time rather than only once per change: a stop suspends, writing the resume point
to `openspec/changes/<name>/STOPPED.md`, and the next `/start-change` consumes it
and picks the work up where it was left. Merge stays the only gate *inside* the
brackets. Why that is not a contradiction of "one gate" is argued in the
`openspec-change-flow` skill — the metric was never the number of stops but
whether a decision lives at each one, and "does this deserve a change?" was the
decision the old flow left ungated.

A change proposed for later is not left in the transcript. The agent writes it
to `todo/<slug>.md` and commits it. A later `/start-change` that matches it uses
its slug and seeds the proposal from it, and `/archive-on-green` deletes it in
the archive commit.

**Checker** — `scripts/check-specs`, four checks over `openspec/`:

| check | fails when |
|---|---|
| `scenarios` | a `MODIFIED` delta omits a scenario the live requirement carries |
| `duplicates` | one spec declares the same requirement name twice |
| `inventories` | a capability that declares it enumerates code disagrees with it |
| `strict` | `openspec validate --specs --strict` does |

Three are pure text comparisons over `openspec/`, with no knowledge of your
stack. 57 unit tests, no fixtures on disk.

## Install

The repository is its own Claude Code marketplace. Enable the plugin for
everyone who opens the consumer repository by committing this to its
`.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "openspec-steward": {
      "source": {
        "source": "github",
        "repo": "codecicada/openspec-steward",
        "ref": "v0.6.0"
      }
    }
  },
  "enabledPlugins": {
    "openspec-steward@openspec-steward": true
  }
}
```

Pin `ref` to a tag for the same reason the checker is pinned: a moving default
branch would change the flow an agent follows without a commit in the consumer.
Claude Code offers to install the marketplace and the plugin the first time the
repository is trusted. For one machine only, without touching the repository:

```bash
claude plugin marketplace add codecicada/openspec-steward
claude plugin install openspec-steward@openspec-steward
```

Then set the consumer repository up for the flow. In Claude Code, run
`/openspec-steward:init`. Without Claude Code:

```bash
node <plugin>/scripts/init/index.mjs --root .
```

It adds the steward artifact rules to `openspec/config.yaml`, and a marked flow
summary to `AGENTS.md` for agents that read that file rather than this plugin's
skills. A second run changes nothing.

A `rules:` block that is already there is never rewritten. If it holds every
steward rule, rules of your own beside them included, it counts as set up.
Otherwise init refuses, writing nothing, and prints only the steward items it
lacks: add them under their keys, next to your own, and run init again. It also
refuses when `openspec/config.yaml` is missing (run `openspec init` first), or
when the block is not block style (`key:` lines, each once, with `- item` lists)
and so cannot be read.

The `AGENTS.md` section is seven lines, plus one blank line before it: the
order, where the rules live, and a link to [the flow](docs/change-flow.md),
short enough for an `AGENTS.md` that is a router with a line cap. It names merge
on request as the flow's gate, not the repository's only one: where your own
rules also require approval to apply, commit or archive, those still bind, and
the section says so.

Then wire the checker into the consumer repository:

```bash
# 1. run the checks
node <plugin>/scripts/check-specs/index.mjs --root .

# 2. wire them in — as an npm script, a CI job, and a pre-push hook
```

`openspec` must be resolvable in the consumer repo for the `strict` check. Pin
it as a devDependency — note the scope, **`@fission-ai/openspec`**; the bare
`openspec` on npm is an unrelated package whose only published version is
`0.0.0`, so a pin written from the command name alone installs something else
under the name your build then trusts.

The checker needs no build, no database and no credentials, so give it its own CI
job rather than appending it to one that builds. It needs no git history either —
check out shallow.

## Migrating from openspec-flow

The plugin was called openspec-flow until 0.5.0. The name was changed because
`openspec-flow` on npm is an unrelated package. To upgrade:

1. In `.claude/settings.json`, rename the marketplace key `openspec-flow` to
   `openspec-steward`, set `repo` to `codecicada/openspec-steward` and `ref` to
   `v0.5.0`, and replace `openspec-flow@openspec-flow` in `enabledPlugins` with
   `openspec-steward@openspec-steward`.
2. Rename `openspec-flow.json` to `openspec-steward.json`.

Step 2 can wait. Until 1.0 the checker still reads `openspec-flow.json` when it
is the only config file, and prints a deprecation note on stderr. With both
present, `openspec-steward.json` wins and the note names `openspec-flow.json` as
ignored. Neither note changes the exit code.

Skill names, commands and the `openspec-check-specs` bin are unchanged; only the
plugin namespace in front of them moves from `openspec-flow:` to
`openspec-steward:`. A consumer pinned to an older tag keeps working as it is.

## Declaring an inventory

Three of the four checks work anywhere. `inventories` has to derive something
from *your* code, which is the one thing this plugin cannot know: routes come
from NestJS decorators in one repository, an Express router in another, an
OpenAPI document in a third.

So the derivation is yours. `openspec-steward.json` at the repository root:

```json
{
  "derivers": {
    "routes": "./scripts/derive-routes.mjs"
  }
}
```

The module default-exports `(root) => string[]`, and **should** also export
`normalise(item) => string`:

```js
export default function deriveRoutes(root) { /* ... */ }

// Applied to BOTH sides — your derived items and the ones the declaring
// requirement lists.
export function normalise(item) { /* ... */ }
```

`normalise` being applied to both sides is what makes the comparison symmetric.
Only you know that `:id` and `:widgetId` are one route, or that a query string
is not part of a path — but normalising only your own side reports every
difference of spelling as drift. That was the first bug this seam produced, found
by running the plugin against a real repository whose repo-local version had
normalised both sides inside one function.

A capability then opts in, **inside** the requirement making the claim:

```markdown
### Requirement: Versioned REST surface

<!-- enumerates: routes -->

The system SHALL expose the following endpoints...
```

Placement matters and is the opposite of the `drops-scenario` marker's rule —
see the `openspec-spec-drift` skill for why.

An inventory no capability declares passes silently. Deciding that something
deserves a capability is a judgement, not a defect.

The comparison reads what each unarchived change will make live, not only
`openspec/specs/`. A change that adds a route puts it in the code and in its
`MODIFIED` delta, and the flow archives only after CI is green, so the check
cannot wait for the archive. For each change under `openspec/changes/` (not
`archive/`):

- An `ADDED` or `MODIFIED` requirement carrying the marker replaces the live
  requirement's list, exactly as archive will replace its body. A finding drawn
  from it names the change: `add-events -> rest-api: ...`.
- A `MODIFIED` requirement that leaves out a marker the live requirement
  carries fails the check, naming the change, requirement and inventory. Archive
  replaces the body in full, so the declaration would vanish with the marker and
  the claim would stop being enforced. Put the marker back or, if the removal is
  deliberate, say so above the delta's first `##`:

  ```markdown
  <!-- drops-inventory: Versioned REST surface :: routes -->
  ```

  Either way the live list is not compared: it is about to stop existing.
- Any other delta requirement without the marker overlays nothing; the live
  list stays in force until archive.
- Two unarchived changes that both replace the same declaring requirement fail
  the check, and that requirement is not compared. Each replaces it in full, so
  whichever archives last would discard the other's items — or, if it drops the
  declaration, the other's whole list. Fold them into one change, or archive one
  and rebase the other's delta.

## What it cannot do

No check here reads application code, so none can tell you whether a requirement
is still **true** — only whether a stated claim has stopped holding. A capability
can be structurally perfect, pass every check, and explain its behaviour with a
reason that stopped being true months ago. That class needs a reader.

## Developing this package

```bash
npm test            # 79 unit tests, no dependencies, no fixtures on disk
npm run test:bin    # packs, installs and drives the bins the way a consumer gets them
npm run test:gates  # watches each /start-change and /stop-change refusal refuse
npm run test:plugin # Claude Code's own validator over the manifests, skills and commands
```

All four run in CI (`.github/workflows/ci.yml`) on every pull request and every
push to `master` — the unit tests across Node 20, 22 and 24, the smoke test on
22, the gate refusals on git alone, and the plugin validation on 22.

`test:plugin` installs a pinned `@anthropic-ai/claude-code` and runs
`claude plugin validate --strict .` with an empty `HOME` and no
`ANTHROPIC_API_KEY`, so it needs no credentials. It also validates three broken
copies of the tree — invalid `plugin.json`, a skill without frontmatter,
unparseable command frontmatter — and expects each to fail; dropping `--strict`
reddens the second. It does not check that the marketplace `source` exists or
that the marketplace entry's name matches `plugin.json`.

The two are not redundant. Every unit test imports a module under `lib/`
directly and never reaches the entry point, so when the bin silently exited 0
through its npm symlink all 37 stayed green: `process.argv[1]` is the symlink
while `import.meta.url` is the real file, and the entry guard compared them
directly. `scripts/check-specs/smoke-bin.sh` covers that seam by installing the
packed tarball into a throwaway project and making six observations — the bin
prints its usage, a missing `openspec` CLI fails loudly rather than passing, a
seeded dropped scenario is caught *and named*, restoring it goes green again,
a legacy `openspec-flow.json` passes with its deprecation note on stderr
only, and `openspec-steward-init`, which carries the same entry guard, writes
its rules through its own symlink.

Watched failing before being trusted, per the `openspec-evidence` skill:
reintroducing that entry guard leaves `npm test` at 37 passed while the smoke
test reports three failures.

`scripts/gates/refusal-cases.sh` does the same job for the two gates, which are
prose and so cannot be run. It builds each refusing state in a throwaway
repository and checks that the detection command the command file names says
something **different** there than in the adjacent permitting state — 26
observations, both directions of every boundary. A refusal whose condition no
command can observe is a sentence, not a gate.

One observation is not a refusal: `--abandon` destroys a branch, so the harness
deletes both branches and then restores the work from the verified tag **in a
clone that never had it**. Claiming "recoverable" without recovering it once is
the kind of green this repository refuses everywhere else.

Watched failing too — six mutations, each reddening exactly what reads it and
nothing else: the name search narrowed to `-maxdepth 1`; the abandon pin checked
with a local `git tag -l` instead of `git ls-remote`; the tag push skipped while
the destroy runs anyway (which takes the pin check **and** the recovery — the
`rescue/full-spike-work` failure reproduced on demand); the resume marker stubbed
to always be present; the recorded head stubbed to always resolve; and the
second-change search stopped excluding the resumed change's own name. What the
harness does **not** cover is printed by the run itself — the "does this deserve
a change?" judgement, the pull-request states, reverting code that reached the
base, and whether an agent obeys a refusal it can see.

## Licence

MIT — see [`LICENSE`](LICENSE).
