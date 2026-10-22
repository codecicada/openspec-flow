import { deepStrictEqual, match, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { CONFIG_FILE, LEGACY_CONFIG_FILE, selectConfig } from './config.mjs';

const routes = JSON.stringify({ derivers: { routes: './derive-routes.mjs' } });
const events = JSON.stringify({ derivers: { events: './derive-events.mjs' } });

test('the current file is read, with no note', () => {
  const { derivers, file, notes } = selectConfig({
    current: routes,
    legacy: null,
  });

  deepStrictEqual(derivers, { routes: './derive-routes.mjs' });
  strictEqual(file, CONFIG_FILE);
  deepStrictEqual(notes, []);
});

test('no file means no derivers and no note', () => {
  const { derivers, file, notes } = selectConfig({
    current: null,
    legacy: null,
  });

  deepStrictEqual(derivers, {});
  strictEqual(file, null);
  deepStrictEqual(notes, []);
});

test('the legacy file alone is read, with a note naming both files', () => {
  const { derivers, file, notes } = selectConfig({
    current: null,
    legacy: routes,
  });

  deepStrictEqual(derivers, { routes: './derive-routes.mjs' });
  strictEqual(file, LEGACY_CONFIG_FILE);
  strictEqual(notes.length, 1);
  match(notes[0], new RegExp(LEGACY_CONFIG_FILE.replace('.', '\\.')));
  match(notes[0], new RegExp(CONFIG_FILE.replace('.', '\\.')));
  match(notes[0], /deprecated/);
});

test('with both present the current file wins and the legacy one is named as ignored', () => {
  const { derivers, file, notes } = selectConfig({
    current: routes,
    legacy: events,
  });

  deepStrictEqual(derivers, { routes: './derive-routes.mjs' });
  strictEqual(file, CONFIG_FILE);
  strictEqual(notes.length, 1);
  match(notes[0], new RegExp(LEGACY_CONFIG_FILE.replace('.', '\\.')));
  match(notes[0], /ignored/);
});

test('an ignored legacy file is not parsed', () => {
  // A consumer mid-migration may leave a half-edited legacy file behind; it
  // must not fail a run that never reads it.
  const { derivers } = selectConfig({ current: routes, legacy: '{ not json' });

  deepStrictEqual(derivers, { routes: './derive-routes.mjs' });
});

test('a file without derivers means no derivers', () => {
  const { derivers } = selectConfig({ current: '{}', legacy: null });

  deepStrictEqual(derivers, {});
});
