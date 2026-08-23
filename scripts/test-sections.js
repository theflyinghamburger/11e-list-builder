import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { unitTypes, groupUnits, SECTIONS, OTHER_SECTION } from '../src/utils/sections.js';

// Keyword parsing: plain tokens and Wahapedia's per-model "NAME: TYPE" encoding
assert.ok(unitTypes({ keywords: ['infantry', 'BATTLELINE'] }).has('INFANTRY'));
assert.ok(unitTypes({ keywords: ['KEYWORDS – ALL MODELS: INFANTRY'] }).has('INFANTRY'));
assert.ok(unitTypes({ keywords: ['CADIAN COMMAND SQUADCADIAN COMMANDER: CHARACTER'] }).has('CHARACTER'));
assert.equal(unitTypes({}).size, 0);
assert.equal(unitTypes(undefined).size, 0);

// Priority: unit lands in the first section (in priority order) it matches
const ds = {
  EPIC: { keywords: ['EPIC HERO', 'CHARACTER', 'INFANTRY'] },
  CHAR: { keywords: ['CHARACTER', 'INFANTRY'] },
  VEH: { keywords: ['VEHICLE', 'AIRCRAFT'] },
  MTD: { keywords: ['MOUNTED', 'CHARACTER'] },
  OTHER: { keywords: ['MONSTER', 'BEAST'] },
};
const groups = groupUnits(
  ['EPIC', 'CHAR', 'VEH', 'MTD', 'OTHER', 'GHOST'].map((name) => ({ name })),
  ds,
);
const byTitle = Object.fromEntries(groups.map((g) => [g.title, g.units.map((u) => u.name)]));
assert.deepEqual(groups.map((g) => g.title), [...SECTIONS.map((s) => s.title), OTHER_SECTION]);
assert.deepEqual(byTitle['EPIC HERO'], ['EPIC']);
assert.deepEqual(byTitle['CHARACTERS'], ['CHAR', 'MTD']);
assert.deepEqual(byTitle['INFANTRY'], []);
assert.deepEqual(byTitle['VEHICLES'], ['VEH']);
assert.deepEqual(byTitle['MOUNTED'], []);
assert.deepEqual(byTitle[OTHER_SECTION], ['OTHER', 'GHOST']); // unknown type and missing datasheet both fall through

// Real datasheet entries (the cases that motivated the priority rule)
const sm = JSON.parse(readFileSync(new URL('../src/data/datasheets/space-marines.json', import.meta.url)));
const da = JSON.parse(readFileSync(new URL('../src/data/datasheets/chaos-daemons.json', import.meta.url)));
const ty = JSON.parse(readFileSync(new URL('../src/data/datasheets/tyranids.json', import.meta.url)));
const real = { ...sm, ...da, ...ty };
const realGroups = groupUnits(
  ['ADRAX AGATONE', 'CAPTAIN', 'ANCIENT', 'CHAPLAIN ON BIKE', 'INTERCESSOR SQUAD', 'DREADNOUGHT', 'SCREAMERS', 'TOXICRENE'].map((name) => ({ name })),
  real,
);
const realByTitle = Object.fromEntries(realGroups.map((g) => [g.title, g.units.map((u) => u.name)]));
assert.deepEqual(realByTitle['EPIC HERO'], ['ADRAX AGATONE']);
assert.deepEqual(realByTitle['CHARACTERS'].sort(), ['ANCIENT', 'CAPTAIN', 'CHAPLAIN ON BIKE']);
assert.deepEqual(realByTitle['INFANTRY'], ['INTERCESSOR SQUAD']);
assert.deepEqual(realByTitle['VEHICLES'], ['DREADNOUGHT']);
assert.deepEqual(realByTitle[OTHER_SECTION].sort(), ['SCREAMERS', 'TOXICRENE']);

console.log('sections: all checks passed');
