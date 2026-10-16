/**
 * The inventory check: a capability that claims to enumerate something is held
 * to it.
 *
 * In the repository this package was extracted from, a capability said its
 * route list "is the whole surface: a route that exists in the API but is
 * absent here is a spec defect", and carried a scenario asserting the
 * comparison holds. Nothing performed that comparison, and for six weeks the
 * list was missing five of twenty-three routes — while the API reference
 * document was correct throughout, because a documentation checker made
 * exactly this comparison against it.
 *
 * Only a **declared** inventory is checked. A capability mentioning a route in
 * passing is not claiming completeness, and treating it as one would make every
 * incidental mention a maintenance burden. An inventory no capability declares
 * passes silently: deciding that it deserves a capability is a judgement, not a
 * defect.
 *
 * Pure: the caller supplies both sides; `index.mjs` owns the reads and the
 * derivation.
 */

import {
  parseInventoryDeclarations,
  parseInventoryDropMarkers,
  parseInventoryItems,
  parseSpec,
} from './parse.mjs';
import { createFailure } from './report.mjs';

/** Delta operations whose requirement body becomes the live one on archive. */
const OVERLAYING = new Set(['ADDED', 'MODIFIED']);

/** Only MODIFIED replaces a live requirement, so only MODIFIED can drop a marker. */
const REPLACING = 'MODIFIED';

/** The declarations one spec or delta text makes, with their listed items. */
function declarationsIn(text, capability, normalisers, keep = () => true) {
  return parseInventoryDeclarations(text)
    .filter((d) => keep(d.requirement))
    .map((d) => ({
      capability,
      requirement: d.requirement,
      inventory: d.inventory,
      items: parseInventoryItems(
        text,
        d.requirement,
        normalisers[d.inventory],
      ),
    }));
}

/**
 * The declarations `checkInventories` compares: the live specs, overlaid with
 * what each unarchived change will make live when it is archived.
 *
 * Without the overlay the check could not pass on a change that adds an item.
 * The route goes into the code and into the change's MODIFIED delta; the live
 * list stays one short until `openspec archive` runs; and the flow archives
 * only once CI — which runs this check — is green. So the change could never
 * get there.
 *
 * The overlay follows what archive will do, one requirement at a time:
 *
 * - An ADDED or MODIFIED requirement that carries an `enumerates` marker
 *   replaces every live declaration of the same requirement in the same
 *   capability, or is a new declaration when the live spec has none. Archive
 *   replaces a requirement in full, so its list replaces the live list rather
 *   than adding to it.
 * - A MODIFIED requirement that leaves out a marker its live counterpart
 *   carries is a finding, unless the delta's header holds a
 *   `<!-- drops-inventory: <Requirement> :: <inventory> -->` marker naming it.
 *   Archive replaces the body in full, so the declaration goes with the marker
 *   and the claim stops being enforced without any check saying so. Either
 *   way the live list is not compared: it is about to stop existing, and an
 *   omission reported against it would point at the wrong fix.
 * - Any other delta requirement without a marker overlays nothing, and the
 *   live list stays in force until archive.
 * - Two changes that both replace a declaring requirement are a finding, and
 *   that requirement is not compared. They are not unioned: each delta
 *   replaces the requirement in full, so whichever is archived last discards
 *   the other's items — or, when one drops the declaration, the other's whole
 *   list. A union would pass a state archive never produces, and picking one
 *   would pass a list the other change is about to overwrite.
 *
 * `live` is `[{ capability, text }]`; `changes` is
 * `[{ name, deltas: [{ capability, text }] }]`; `normalisers` is
 * `{ [inventory]: fn }`. Returns `{ declared, failures }`. A declaration or
 * finding drawn from a delta is labelled `<change> -> <capability>`, as the
 * `scenarios` check labels its findings, so a failure names the change to fix.
 */
export function collectDeclarations({
  live = [],
  changes = [],
  normalisers = {},
} = {}) {
  const key = (capability, requirement) => `${capability}\u0000${requirement}`;

  // The inventories each live requirement declares.
  const liveInventories = new Map();
  for (const spec of live) {
    for (const d of parseInventoryDeclarations(spec.text)) {
      const k = key(spec.capability, d.requirement);
      liveInventories.set(k, [...(liveInventories.get(k) ?? []), d.inventory]);
    }
  }

  const failures = [];

  // Every change that replaces a declaring requirement, in the order they are
  // read, with the declarations it leaves behind — none, when it drops them.
  const overlays = new Map();
  for (const change of changes) {
    for (const delta of change.deltas ?? []) {
      const label = `${change.name} -> ${delta.capability}`;
      const requirements = parseSpec(delta.text).requirements.filter((r) =>
        OVERLAYING.has(r.operation),
      );
      const overlaying = new Set(requirements.map((r) => r.name));
      const found = declarationsIn(
        delta.text,
        delta.capability,
        normalisers,
        (requirement) => overlaying.has(requirement),
      );
      const dropMarkers = parseInventoryDropMarkers(delta.text);

      for (const { name: requirement, operation } of requirements) {
        const k = key(delta.capability, requirement);
        const declarations = found
          .filter((d) => d.requirement === requirement)
          .map((d) => ({ ...d, capability: label }));
        const kept = new Set(declarations.map((d) => d.inventory));
        const replacesDeclaration =
          operation === REPLACING && liveInventories.has(k);

        if (replacesDeclaration) {
          for (const inventory of new Set(liveInventories.get(k))) {
            const deliberate = dropMarkers.some(
              (m) => m.requirement === requirement && m.inventory === inventory,
            );
            if (!kept.has(inventory) && !deliberate) {
              failures.push(
                createFailure(
                  `${label}: MODIFIED requirement "${requirement}" drops its declaration that it enumerates "${inventory}", so archive would leave the claim unenforced`,
                  `put \`<!-- enumerates: ${inventory} -->\` back inside the requirement — a MODIFIED requirement replaces its counterpart in full, so a marker it leaves out is deleted — or, if the removal is deliberate, add \`<!-- drops-inventory: ${requirement} :: ${inventory} -->\` above the first \`##\` header naming it`,
                ),
              );
            }
          }
        }

        if (declarations.length > 0 || replacesDeclaration) {
          const entries = overlays.get(k) ?? [];
          entries.push({
            change: change.name,
            capability: delta.capability,
            requirement,
            declarations,
          });
          overlays.set(k, entries);
        }
      }
    }
  }

  const conflicted = new Set();
  for (const [k, entries] of overlays) {
    const names = [...new Set(entries.map((e) => e.change))];
    if (names.length > 1) {
      conflicted.add(k);
      const { capability, requirement } = entries[0];
      failures.push(
        createFailure(
          `${capability}: requirement "${requirement}" declares an inventory and is replaced by ${names.length} unarchived changes: ${names.join(', ')}`,
          'fold them into one change, or archive one and rebase the other\'s delta on the result — each replaces the requirement in full, so whichever archives last would discard the other\'s items, and neither list can be checked until then',
        ),
      );
    }
  }

  const declared = [];
  for (const spec of live) {
    for (const d of declarationsIn(spec.text, spec.capability, normalisers)) {
      if (!overlays.has(key(spec.capability, d.requirement))) {
        declared.push(d);
      }
    }
  }
  for (const [k, entries] of overlays) {
    if (!conflicted.has(k)) {
      for (const entry of entries) {
        declared.push(...entry.declarations);
      }
    }
  }

  return { declared, failures };
}

/**
 * Compare each declared inventory against the one derived from the code.
 *
 * `declared` is `[{ capability, requirement, inventory, items }]`; `derived` is
 * `{ [inventory]: items }`. Comparison is by exact string, so the caller
 * normalises both sides — parameter names in a route path, for instance — before
 * handing them over.
 *
 * A declaration naming an inventory nothing derives is its own finding rather
 * than a silent pass: it means the marker is misspelled or the derivation was
 * removed, and both leave the capability's claim unenforced while looking
 * enforced.
 */
export function checkInventories({ declared = [], derived = {} } = {}) {
  const failures = [];

  for (const entry of declared) {
    const { capability, requirement, inventory, items = [] } = entry;

    if (!Object.prototype.hasOwnProperty.call(derived, inventory)) {
      failures.push(
        createFailure(
          `${capability}: requirement "${requirement}" declares it enumerates "${inventory}", but nothing derives such an inventory`,
          'correct the marker to name an inventory the checker derives, or remove it — a declaration nothing checks leaves the claim unenforced while looking enforced',
        ),
      );
      continue;
    }

    const inCode = new Set(derived[inventory]);
    const inSpec = new Set(items);

    const missingFromSpec = [...inCode].filter((i) => !inSpec.has(i)).sort();
    const missingFromCode = [...inSpec].filter((i) => !inCode.has(i)).sort();

    if (missingFromSpec.length > 0) {
      failures.push(
        createFailure(
          `${capability}: requirement "${requirement}" enumerates ${inventory} and omits ${missingFromSpec.length}: ${missingFromSpec.join(', ')}`,
          `add each to the list in "${requirement}" — the requirement claims the list is complete, so an omission is a spec defect rather than a shorter list`,
        ),
      );
    }

    if (missingFromCode.length > 0) {
      failures.push(
        createFailure(
          `${capability}: requirement "${requirement}" lists ${missingFromCode.length} ${inventory} the code does not have: ${missingFromCode.join(', ')}`,
          'remove each from the list, or restore it in the code — a removal the spec did not follow leaves the capability describing something that no longer exists',
        ),
      );
    }
  }

  return failures;
}
