# openspec-flow

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
| `openspec-change-flow` | the sequence, why one gate inside the brackets, archive-on-verified-green, the `gh pr checks --watch` false green, post-archive verification |
| `openspec-spec-drift` | what a `MODIFIED` delta silently deletes, both marker placement rules and why they are opposites, the doc-vs-spec asymmetry |
| `openspec-evidence` | watch a check fail before trusting it; three ways a green check means nothing |

**Commands**:

- `/start-change <description>` — describe the work; it proposes a session title and a change slug, then opens the flow (or resumes one a stop suspended): does this deserve a change, is the tree clean, is the base current, is the slug free
- `/archive-on-green` — pin the head SHA, confirm each check by name, archive, verify the apply
- `/verify-green` — is this PR actually green, against its current head?
- `/stop-change` — stop the flow: closed if the change reached its end, suspended with a recorded resume point if it did not; `--abandon` destroys it, code and all, after pinning the commits to a verified remote tag

`/start-change` and `/stop-change` bracket the flow, and the brackets nest in
time rather than only once per change: a stop suspends, writing the resume point
to `openspec/changes/<name>/STOPPED.md`, and the next `/start-change` consumes it
and picks the work up where it was left. Merge stays the only gate *inside* the
brackets. Why that is not a contradiction of "one gate" is argued in the
`openspec-change-flow` skill — the metric was never the number of stops but
whether a decision lives at each one, and "does this deserve a change?" was the
decision the old flow left ungated.

**Checker** — `scripts/check-specs`, four checks over `openspec/`:

| check | fails when |
|---|---|
| `scenarios` | a `MODIFIED` delta omits a scenario the live requirement carries |
| `duplicates` | one spec declares the same requirement name twice |
| `inventories` | a capability that declares it enumerates code disagrees with it |
| `strict` | `openspec validate --specs --strict` does |

Three are pure text comparisons over `openspec/`, with no knowledge of your
stack. 37 unit tests, no fixtures on disk.

## Install

The repository is its own Claude Code marketplace. Enable the plugin for
everyone who opens the consumer repository by committing this to its
`.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "openspec-flow": {
      "source": {
        "source": "github",
        "repo": "yannicklescure/openspec-flow",
        "ref": "v0.2.2"
      }
    }
  },
  "enabledPlugins": {
    "openspec-flow@openspec-flow": true
  }
}
```

Pin `ref` to a tag for the same reason the checker is pinned: a moving default
branch would change the flow an agent follows without a commit in the consumer.
Claude Code offers to install the marketplace and the plugin the first time the
repository is trusted. For one machine only, without touching the repository:

```bash
claude plugin marketplace add yannicklescure/openspec-flow
claude plugin install openspec-flow@openspec-flow
```

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

## Declaring an inventory

Three of the four checks work anywhere. `inventories` has to derive something
from *your* code, which is the one thing this plugin cannot know: routes come
from NestJS decorators in one repository, an Express router in another, an
OpenAPI document in a third.

So the derivation is yours. `openspec-flow.json` at the repository root:

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

## What it cannot do

No check here reads application code, so none can tell you whether a requirement
is still **true** — only whether a stated claim has stopped holding. A capability
can be structurally perfect, pass every check, and explain its behaviour with a
reason that stopped being true months ago. That class needs a reader.

## Developing this package

```bash
npm test            # 37 unit tests, no dependencies, no fixtures on disk
npm run test:bin    # packs, installs and drives the bin the way a consumer gets it
npm run test:gates  # watches each /start-change and /stop-change refusal refuse
```

All three run in CI (`.github/workflows/ci.yml`) on every pull request and every
push to `master` — the unit tests across Node 20, 22 and 24, the smoke test on
22, the gate refusals on git alone.

The two are not redundant. Every unit test imports a module under `lib/`
directly and never reaches the entry point, so when the bin silently exited 0
through its npm symlink all 37 stayed green: `process.argv[1]` is the symlink
while `import.meta.url` is the real file, and the entry guard compared them
directly. `scripts/check-specs/smoke-bin.sh` covers that seam by installing the
packed tarball into a throwaway project and making four observations — the bin
prints its usage, a missing `openspec` CLI fails loudly rather than passing, a
seeded dropped scenario is caught *and named*, and restoring it goes green
again.

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

MIT
