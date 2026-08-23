import assert from 'node:assert';
import { unzipSync } from 'fflate';
import {
  armyToRos, armyToRozs, rosToArmy, armyDataToArmy,
  factionKeyFromName, factionDisplayName, PROXY,
} from '../src/utils/yellowscribe.js';

const SYSTEM_11E = 'sys-352e-adc2-7639-d610';

const army = {
  name: 'Test Army',
  faction: 'adeptus-mechanicus',
  pointLimit: 2000,
  detachments: [{ name: 'COHORT ACQUISITUS', enhancements: [] }],
  units: [
    { id: 'a1', unitName: 'Ironstrider Ballistarii', modelCount: 3, wargear: { 'Twin Cognis Lascannon': 2 } },
    { id: 'a2', unitName: 'Squad Leader & Sons', modelCount: 1, wargear: {} },
  ],
};

// 1. XML shape
const xml = armyToRos(army);
assert.ok(xml.includes(`gameSystemId="${SYSTEM_11E}"`), '11e gameSystemId');
assert.ok(xml.includes('<force name="Test Army"'), 'force name');
assert.ok(xml.includes('Faction: Adeptus Mechanicus'), 'faction category');
assert.ok(xml.includes('<selection type="unit" name="Ironstrider Ballistarii">'), 'unit selection');
assert.ok(xml.includes('<selection type="model" name="Ironstrider Ballistarii" number="3">'), 'model number');
assert.ok(xml.includes('<selection type="upgrade" name="Twin Cognis Lascannon" number="2"/>'), 'wargear upgrade');
assert.ok(xml.includes('Squad Leader &amp; Sons'), 'XML escaping');

// 2. Round-trip: army -> ros -> army
const back = rosToArmy(xml);
assert.equal(back.name, 'Test Army');
assert.equal(back.faction, 'adeptus-mechanicus');
assert.equal(back.pointLimit, 2000);
assert.deepEqual(back.detachments, []);
assert.equal(back.units.length, 2);
assert.equal(back.units[0].unitName, 'Ironstrider Ballistarii');
assert.equal(back.units[0].modelCount, 3);
assert.deepEqual(back.units[0].wargear, { 'Twin Cognis Lascannon': 2 });
assert.equal(back.units[1].unitName, 'Squad Leader & Sons');
assert.equal(back.units[1].modelCount, 1);
assert.deepEqual(back.units[1].wargear, {});

// 3. .rosz zip round-trip
const bytes = armyToRozs(army);
assert.equal(bytes[0], 0x50); assert.equal(bytes[1], 0x4b); // PK zip magic
const entries = unzipSync(bytes);
assert.equal(Object.keys(entries).length, 1, 'single zip entry');
const unzipped = rosToArmy(new TextDecoder().decode(Object.values(entries)[0]));
assert.equal(unzipped.units.length, 2);
assert.equal(unzipped.units[0].modelCount, 3);

// 4. Reject non-11e rosters
assert.throws(() => rosToArmy(xml.replace(SYSTEM_11E, 'sys-352e-adc2-7639-d6a9')), /11e roster/);
assert.throws(() => rosToArmy('<roster><forces></forces></roster>'), /11e roster/);

// 5. Multi-force flatten + multi-model selection sum (NR export shape)
const multi = `<roster gameSystemId="${SYSTEM_11E}"><forces>` +
  `<force name="F1" faction="Orks"><selections>` +
  `<selection type="unit" name="Alpha"><selections>` +
  `<selection type="model" name="A1" number="2"/><selection type="model" name="A2" number="3"/>` +
  `</selections></selection></selections></force>` +
  `<force name="F2"><selections><selection type="unit" name="Beta"/>` +
  `<categories><category name="Faction: Orks"/></categories></selection></selections></force>` +
  `</forces></roster>`;
const m = rosToArmy(multi);
assert.equal(m.units.length, 2, 'forces flattened');
assert.equal(m.units[0].modelCount, 5, 'model numbers summed');
assert.equal(m.units[1].modelCount, 0);
assert.equal(m.name, 'F1');
assert.equal(m.faction, 'orks');

// 6. Faction name<->key maps
assert.equal(factionKeyFromName('Adeptus Mechanicus'), 'adeptus-mechanicus');
assert.equal(factionKeyFromName('Faction: Death Guard'), 'death-guard');
assert.equal(factionKeyFromName("Emperor's Children"), 'emperors-children');
assert.equal(factionKeyFromName("T'au Empire"), 'tau-empire');
assert.equal(factionKeyFromName('Eldar'), 'aeldari');
assert.equal(factionDisplayName('leagues-of-votann'), 'Leagues Of Votann');

// 7. armyDataToArmy: live 11e stored shape (verified against yellowscribe.link)
const stored = {
  edition: '11e',
  order: ['bff', 'aaa'],
  armyData: {
    bff: { name: 'Boys', factionKeywords: ['Orks'], models: { totalNumberOfModels: 5, models: {} } },
    aaa: { name: 'Warboss', factionKeywords: ['Orks'], models: { totalNumberOfModels: 1, models: {} } },
  },
};
const fromStored = armyDataToArmy(stored);
assert.equal(fromStored.name, 'Imported Army');
assert.equal(fromStored.faction, 'orks');
assert.deepEqual(fromStored.units.map((u) => [u.unitName, u.modelCount]), [['Boys', 5], ['Warboss', 1]]);

// 8. armyDataToArmy: edition guard + plain-array fallback
assert.throws(() => armyDataToArmy({ edition: '10e', armyData: {} }), /10e/);
const fallback = armyDataToArmy({ armyData: [
  { name: 'A', factionKeywords: ['Necrons'], models: 5 },
  { name: 'B', factionKeywords: ['Necrons'], models: 3 },
]});
assert.deepEqual(fallback.units.map((u) => [u.unitName, u.modelCount]), [['A', 5], ['B', 3]]);
assert.equal(fallback.faction, 'necrons');

// 9. PROXY starts empty (code buttons hidden)
assert.equal(PROXY, '');

console.log('yellowscribe: all checks passed');
