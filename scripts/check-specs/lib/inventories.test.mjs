import { deepStrictEqual, match, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { checkInventories, collectDeclarations } from './inventories.mjs';

const declared = [
  {
    capability: 'rest-api',
    requirement: 'Versioned REST surface',
    inventory: 'routes',
    items: ['GET /health', 'POST /widgets'],
  },
];

test('an item in the code that the declaring capability omits fails', () => {
  const failures = checkInventories({
    declared,
    derived: { routes: ['GET /health', 'POST /widgets', 'GET /jobs/:id'] },
  });

  strictEqual(failures.length, 1);
  match(failures[0].what, /rest-api/);
  match(failures[0].what, /GET \/jobs\/:id/);
  match(failures[0].what, /Versioned REST surface/);
});

test('an item the capability lists that the code no longer has fails', () => {
  const failures = checkInventories({
    declared,
    derived: { routes: ['GET /health'] },
  });

  strictEqual(failures.length, 1);
  match(failures[0].what, /POST \/widgets/);
  match(failures[0].fix, /remov|delete/i);
});

test('a capability declaring nothing is ignored', () => {
  deepStrictEqual(
    checkInventories({
      declared: [],
      derived: { routes: ['GET /health', 'POST /widgets'] },
    }),
    [],
  );
});

test('an inventory nothing declares passes', () => {
  deepStrictEqual(
    checkInventories({
      declared,
      derived: {
        routes: ['GET /health', 'POST /widgets'],
        env: ['NODE_ENV', 'PORT'],
      },
    }),
    [],
  );
});

test('a declaration naming an inventory nothing derives is its own finding', () => {
  const failures = checkInventories({
    declared: [{ ...declared[0], inventory: 'widgets' }],
    derived: { routes: ['GET /health'] },
  });

  strictEqual(failures.length, 1);
  match(failures[0].what, /widgets/);
  match(failures[0].what, /no such inventory|nothing derives/i);
});

test('an exact match passes', () => {
  deepStrictEqual(
    checkInventories({
      declared,
      derived: { routes: ['POST /widgets', 'GET /health'] },
    }),
    [],
  );
});

// --- unarchived deltas overlay the live declarations -----------------------

const liveRestApi = {
  capability: 'rest-api',
  text: `# rest-api Specification

## Purpose
The versioned REST surface.

## Requirements

### Requirement: Versioned REST surface

<!-- enumerates: routes -->

The system SHALL expose \`GET /health\` and \`POST /widgets\`.

#### Scenario: Health is reachable

- **WHEN** a client calls \`GET /health\`
- **THEN** it answers 200
`,
};

/** A change whose MODIFIED delta re-lists the surface with `extra` routes. */
function modifying(name, extra) {
  return {
    name,
    deltas: [
      {
        capability: 'rest-api',
        text: `## MODIFIED Requirements

### Requirement: Versioned REST surface

<!-- enumerates: routes -->

The system SHALL expose \`GET /health\`, \`POST /widgets\`${extra
          .map((r) => `, \`${r}\``)
          .join('')}.

#### Scenario: Health is reachable

- **WHEN** a client calls \`GET /health\`
- **THEN** it answers 200
`,
      },
    ],
  };
}

function check({ changes, routes }) {
  const { declared, failures } = collectDeclarations({
    live: [liveRestApi],
    changes,
  });
  return [...failures, ...checkInventories({ declared, derived: { routes } })];
}

test('a route the live spec omits passes when an unarchived MODIFIED delta adds it', () => {
  deepStrictEqual(
    check({
      changes: [modifying('2026-10-15-events', ['GET /events'])],
      routes: ['GET /health', 'POST /widgets', 'GET /events'],
    }),
    [],
  );
});

test('a route an unarchived delta adds that the code lacks fails, naming the change', () => {
  const failures = check({
    changes: [modifying('2026-10-15-events', ['GET /events'])],
    routes: ['GET /health', 'POST /widgets'],
  });

  strictEqual(failures.length, 1);
  match(failures[0].what, /2026-10-15-events -> rest-api/);
  match(failures[0].what, /does not have: GET \/events/);
});

test('an ADDED requirement carrying a marker is checked too', () => {
  const failures = check({
    changes: [
      {
        name: '2026-10-15-admin',
        deltas: [
          {
            capability: 'admin-api',
            text: `## ADDED Requirements

### Requirement: Admin surface

<!-- enumerates: routes -->

The system SHALL expose \`GET /admin/stats\`.

#### Scenario: Stats are reachable

- **WHEN** an admin calls it
- **THEN** it answers 200
`,
          },
        ],
      },
    ],
    routes: ['GET /health', 'POST /widgets'],
  });

  // Both lists are complete claims over one derived inventory, so each one
  // reports the routes the other owns. That is the existing rule for two
  // declarations of the same inventory; the point here is that the ADDED one
  // is read at all.
  match(
    failures.map((f) => f.what).join('\n'),
    /2026-10-15-admin -> admin-api: requirement "Admin surface" lists 1 routes the code does not have: GET \/admin\/stats/,
  );
});

test('a delta that modifies the requirement without a marker leaves the live list in force', () => {
  const change = modifying('2026-10-15-events', ['GET /events']);
  change.deltas[0].text = change.deltas[0].text.replace(
    '<!-- enumerates: routes -->\n',
    '',
  );

  const failures = check({
    changes: [change],
    routes: ['GET /health', 'POST /widgets', 'GET /events'],
  });

  strictEqual(failures.length, 1);
  match(failures[0].what, /^rest-api: .* omits 1: GET \/events/);
});

test('two unarchived changes declaring the same inventory requirement fail loudly', () => {
  const failures = check({
    changes: [
      modifying('2026-10-15-events', ['GET /events']),
      modifying('2026-10-15-jobs', ['GET /jobs']),
    ],
    routes: ['GET /health', 'POST /widgets', 'GET /events', 'GET /jobs'],
  });

  strictEqual(failures.length, 1);
  match(failures[0].what, /rest-api/);
  match(failures[0].what, /Versioned REST surface/);
  match(failures[0].what, /2026-10-15-events/);
  match(failures[0].what, /2026-10-15-jobs/);
  match(failures[0].fix, /one change|rebase|combine/i);
});
