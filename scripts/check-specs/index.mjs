#!/usr/bin/env node
/**
 * Specification drift checks for an OpenSpec repository.
 *
 * Four checks, none of which reads application code:
 *
 *   scenarios    a MODIFIED delta omits a scenario the live requirement carries
 *   duplicates   one spec declares the same requirement name twice
 *   inventories  a capability that declares it enumerates code disagrees with it
 *   strict       openspec validate --specs --strict
 *
 * Three of the four are pure text comparisons over `openspec/`. The fourth —
 * `inventories` — needs to derive something from the consumer's code, and that
 * is the one thing this package cannot know: routes come from NestJS
 * decorators in one repository, an Express router in another, an OpenAPI
 * document in a third. So the derivation is a seam, configured per repository
 * (see `deriveInventories` and README.md — "Declaring an inventory").
 *
 * This file owns all disk I/O and the one subprocess call. Every module under
 * `lib/` is a pure function over text, which is why they are unit-tested
 * without fixtures on disk.
 *
 * The delta is compared against the live spec BEFORE archiving, not against the
 * applied result afterwards. That needs no git history, and it fails before the
 * destructive operation rather than reporting that a scenario is already gone.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  CONFIG_FILE,
  LEGACY_CONFIG_FILE,
  selectConfig,
} from './lib/config.mjs';
import { checkDuplicateRequirements } from './lib/duplicates.mjs';
import {
  checkInventories,
  collectDeclarations,
} from './lib/inventories.mjs';
import { parseDropMarkers, parseSpec } from './lib/parse.mjs';
import { createResult, report } from './lib/report.mjs';
import { checkScenarioDrops } from './lib/scenarios.mjs';
import { checkStrictValidation } from './lib/validate.mjs';

const PATHS = {
  specs: 'openspec/specs',
  changes: 'openspec/changes',
};

/** Applied deltas are history; only unarchived changes are inspected. */
const ARCHIVE_DIR = 'archive';

const USAGE = `Usage: check-specs [--root <dir>]

Fails when a specification is structurally unsound, or when an unarchived
change's delta would discard something:
  scenarios    a MODIFIED delta omits a scenario the live requirement carries
  duplicates   one spec declares the same requirement name twice
  inventories  a capability that declares it enumerates code disagrees with it
  strict       openspec validate --specs --strict

Exits 0 when every check passes, 1 otherwise.
Reads no application code, so none of these can tell whether a requirement is
still TRUE — only whether a stated claim has stopped holding.`;

/**
 * Every `spec.md` under a directory, keyed by its path relative to that root.
 *
 * Walked rather than globbed: a capability path may be nested
 * (`identity/user-auth`), and the whole path is its identity.
 */
function collectSpecs(absBase) {
  const found = [];
  if (!existsSync(absBase)) {
    return found;
  }

  const walk = (absDir, relBase) => {
    for (const entry of readdirSync(absDir).sort()) {
      const abs = join(absDir, entry);
      if (statSync(abs).isDirectory()) {
        walk(abs, relBase ? `${relBase}/${entry}` : entry);
      } else if (entry === 'spec.md' && relBase) {
        found.push({ capability: relBase, abs });
      }
    }
  };

  walk(absBase, '');
  return found;
}

/** Unarchived change directories; `archive/` is skipped. */
function collectActiveChanges(root) {
  const absChanges = join(root, PATHS.changes);
  if (!existsSync(absChanges)) {
    return [];
  }

  return readdirSync(absChanges)
    .sort()
    .filter((entry) => entry !== ARCHIVE_DIR)
    .map((entry) => ({ name: entry, abs: join(absChanges, entry) }))
    .filter((change) => statSync(change.abs).isDirectory());
}

/** A file's contents, or `null` when it is absent. */
function readOptional(abs) {
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
}

/**
 * The consumer's configuration, or an empty one. Absence is not an error.
 *
 * Which file wins is `selectConfig`'s decision (`lib/config.mjs`); its notes go
 * to `warn`, never into the results, so they cannot change the exit code.
 */
function readConfig(root, warn) {
  const { derivers, file, notes } = selectConfig({
    current: readOptional(join(root, CONFIG_FILE)),
    legacy: readOptional(join(root, LEGACY_CONFIG_FILE)),
  });
  for (const note of notes) {
    warn(note);
  }
  return { derivers, file };
}

/**
 * Derive each configured inventory by loading the consumer's deriver module.
 *
 * `openspec-steward.json` maps an inventory name to a module path relative to the
 * repository root:
 *
 *     { "derivers": { "routes": "./scripts/derive-routes.mjs" } }
 *
 * Each module default-exports `(root) => string[]`, and MAY also export
 * `normalise(item) => string`.
 *
 * `normalise` is applied to **both** sides — the derived items and the ones the
 * declaring requirement lists — which is the only way the comparison can be
 * symmetric. Only the consumer knows what makes two of its items the same item
 * (that `:id` and `:widgetId` are one route, that a query string is not part
 * of a path), but if it normalises just its own side the check reports every
 * difference of spelling as drift. That was the first bug this seam produced.
 *
 * A deriver that throws is surfaced as a finding rather than crashing the run:
 * a broken deriver must not read as "no drift".
 */
async function deriveInventories(root, config) {
  const derived = {};
  const normalisers = {};
  const failures = [];

  for (const [inventory, modulePath] of Object.entries(config.derivers)) {
    const abs = resolve(root, modulePath);
    if (!existsSync(abs)) {
      failures.push({
        inventory,
        what: `deriver for "${inventory}" not found at ${modulePath}`,
        fix: `correct the path in ${config.file}, or remove the entry if the inventory is no longer derived`,
      });
      continue;
    }
    try {
      const mod = await import(pathToFileURL(abs).href);
      const derive = mod.default ?? mod.derive;
      if (typeof derive !== 'function') {
        failures.push({
          inventory,
          what: `deriver for "${inventory}" exports no function`,
          fix: 'default-export a function taking the repository root and returning an array of strings',
        });
        continue;
      }
      const normalise =
        typeof mod.normalise === 'function' ? mod.normalise : (x) => x;
      derived[inventory] = [...(await derive(root))].map((i) =>
        String(normalise(String(i))),
      );
      normalisers[inventory] = normalise;
    } catch (error) {
      failures.push({
        inventory,
        what: `deriver for "${inventory}" threw: ${error.message}`,
        fix: 'fix the deriver — a deriver that cannot run must not be read as "nothing drifted"',
      });
    }
  }

  return { derived, normalisers, failures };
}

/** Run openspec's own validator in the consumer's repository. */
function runOpenspecValidate(root) {
  const result = spawnSync(
    'npx',
    ['--no-install', 'openspec', 'validate', '--specs', '--strict'],
    { cwd: root, encoding: 'utf8' },
  );

  // spawnSync reports a launch failure via `error`, with a null status. A
  // missing CLI must not read as "validation passed".
  if (result.error) {
    return {
      status: 127,
      stdout: '',
      stderr: `could not run openspec: ${result.error.message}`,
    };
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

export async function runAllChecks(
  root = process.cwd(),
  { warn = (line) => console.error(line) } = {},
) {
  const config = readConfig(root, warn);

  const liveSpecs = collectSpecs(join(root, PATHS.specs)).map((spec) => {
    const text = readFileSync(spec.abs, 'utf8');
    return {
      capability: spec.capability,
      path: `${PATHS.specs}/${spec.capability}/spec.md`,
      text,
      parsed: parseSpec(text),
    };
  });

  const { derived, normalisers, failures: deriverFailures } =
    await deriveInventories(root, config);

  const liveByCapability = new Map(
    liveSpecs.map((spec) => [spec.capability, spec.parsed]),
  );

  const changes = collectActiveChanges(root).map((change) => ({
    name: change.name,
    deltas: collectSpecs(join(change.abs, 'specs')).map((delta) => ({
      capability: delta.capability,
      text: readFileSync(delta.abs, 'utf8'),
    })),
  }));

  const { declared, failures: declarationFailures } = collectDeclarations({
    live: liveSpecs,
    changes,
    normalisers,
  });

  const scenarioFailures = [];
  for (const change of changes) {
    for (const delta of change.deltas) {
      const { text } = delta;
      scenarioFailures.push(
        ...checkScenarioDrops({
          capability: `${change.name} -> ${delta.capability}`,
          delta: parseSpec(text),
          live: liveByCapability.get(delta.capability) ?? { requirements: [] },
          markers: parseDropMarkers(text),
        }),
      );
    }
  }

  return [
    createResult('scenarios', scenarioFailures),
    createResult('duplicates', checkDuplicateRequirements(liveSpecs)),
    createResult('inventories', [
      ...deriverFailures.map((f) => ({ what: f.what, fix: f.fix })),
      ...declarationFailures,
      ...checkInventories({ declared, derived }),
    ]),
    createResult(
      'strict',
      checkStrictValidation({ run: () => runOpenspecValidate(root) }),
    ),
  ];
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return 0;
  }

  const rootFlag = argv.indexOf('--root');
  const root =
    rootFlag === -1 ? process.cwd() : resolve(argv[rootFlag + 1] ?? '.');

  return report(await runAllChecks(root));
}

/**
 * Was this file invoked directly?
 *
 * Compared through `realpathSync` on both sides, because npm installs a `bin`
 * as a SYMLINK: `process.argv[1]` is then `node_modules/.bin/openspec-check-specs`
 * while `import.meta.url` is the real file, and a naive equality check fails.
 * The failure is silent and green — the module loads, `main` never runs, the
 * process exits 0 — so a CI job calling the bin would pass forever without
 * checking anything. Found by running the bin through its symlink instead of
 * assuming it behaved like a direct `node` invocation.
 */
function invokedDirectly() {
  if (!process.argv[1]) {
    return false;
  }
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  process.exit(await main(process.argv.slice(2)));
}

export { dirname };
