#!/usr/bin/env node
/**
 * Sets up a consumer repository for the openspec-steward flow.
 *
 * Two files, both at the repository root:
 *
 *   openspec/config.yaml  gains the steward `rules:` block
 *   AGENTS.md             gains a marked section summarising the flow
 *
 * Every decision is made by `planInit` over the two files' contents before
 * anything is written, so a refusal writes nothing. A second run on its own
 * output changes nothing and exits 0.
 *
 * This file owns all disk I/O. Every module under `lib/` is a pure function
 * over text, unit-tested without fixtures on disk.
 */

import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planInit } from './lib/init.mjs';

const USAGE = `Usage: openspec-steward-init [--root <dir>]

Adds the openspec-steward rules to openspec/config.yaml and the flow
summary to AGENTS.md, under <dir> (default: the working directory).

Exits 0 when both files are set up, 1 when it refuses. A refusal writes
nothing.`;

const FILES = {
  config: join('openspec', 'config.yaml'),
  agents: 'AGENTS.md',
};

function readOrNull(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return 0;
  }

  const rootFlag = argv.indexOf('--root');
  const root =
    rootFlag === -1 ? process.cwd() : resolve(argv[rootFlag + 1] ?? '.');

  const plan = planInit({
    config: readOrNull(join(root, FILES.config)),
    agents: readOrNull(join(root, FILES.agents)),
  });

  if (plan.refusal) {
    console.error(plan.refusal);
    return 1;
  }

  for (const [key, file] of Object.entries(FILES)) {
    if (key in plan.writes) {
      writeFileSync(join(root, file), plan.writes[key]);
      console.log(`updated ${file}`);
    } else {
      console.log(`${file} already set up`);
    }
  }
  return 0;
}

/**
 * Was this file invoked directly?
 *
 * Compared through `realpathSync` on both sides, because npm installs a `bin`
 * as a SYMLINK: `process.argv[1]` is then `node_modules/.bin/openspec-steward-init`
 * while `import.meta.url` is the real file, and a naive equality check fails
 * silently: the module loads, `main` never runs, the process exits 0. See the
 * same guard in `scripts/check-specs/index.mjs`.
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
  process.exit(main(process.argv.slice(2)));
}
