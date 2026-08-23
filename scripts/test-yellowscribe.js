import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import {
  armyToRos, armyToRozs, rosToArmy, armyDataToArmy,
  factionKeyFromName, factionDisplayName, PROXY,
} from '../src/utils/yellowscribe.js';
import { getUnitPoints } from '../src/utils/costs.js';

const SYSTEM_11E = 'sys-352e-adc2-7639-d610';

// ponytail: node can't import the 29-JSON data/index.js, so load the one file we need and fake the lookup
const admech = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/adeptus-mechanicus.json', import.meta.url)), 'utf8'));
const getData = (key) => (key === 'adeptus-mechanicus' ? admech : undefined);

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
assert.ok(xml.includes('<selection type="upgrade" name="Twin Cognis Lascannon" number="2" group="Wargear"/>'), 'wargear upgrade with group');
assert.ok(xml.includes('<selection type="upgrade" name="Detachment" number="1">'), 'detachment config selection');
assert.ok(xml.includes('<selection type="upgrade" name="COHORT ACQUISITUS" number="1" group="Detachments"/>'), 'detachment child');
assert.ok(xml.includes('Squad Leader &amp; Sons'), 'XML escaping');

// 2. Round-trip: army -> ros -> army
const back = rosToArmy(xml, getData);
assert.equal(back.name, 'Test Army');
assert.equal(back.faction, 'adeptus-mechanicus');
assert.equal(back.pointLimit, 2000);
assert.deepEqual(back.detachments, [{ name: 'COHORT ACQUISITUS', enhancements: [] }], 'detachment survives export->import');
assert.equal(back.units.length, 2);
assert.equal(back.units[0].unitName, 'Ironstrider Ballistarii');
assert.equal(back.units[0].modelCount, 3);
assert.deepEqual(back.units[0].wargear, { 'Twin Cognis Lascannon': 2 });
assert.equal(back.units[1].unitName, 'Squad Leader & Sons');
assert.equal(back.units[1].modelCount, 1);
assert.deepEqual(back.units[1].wargear, {});

// 2b. Enhancements emitted on the first unit survive export->import
const army2 = { ...army, detachments: [{ name: 'ERADICATION COHORT', enhancements: ['Omnissiah’s Fury'] }] };
const xml2 = armyToRos(army2);
assert.ok(xml2.includes('<selection type="upgrade" name="Omnissiah’s Fury" number="1" group="Enhancements::ERADICATION COHORT Enhancements"/>'), 'enhancement upgrade on export');
const back2 = rosToArmy(xml2, getData);
assert.deepEqual(back2.detachments, [{ name: 'ERADICATION COHORT', enhancements: ['Omnissiah’s Fury'] }], 'enhancements survive round-trip');

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

// 10. Wargear name normalization in cost calc (NR "Ferrumite cannon" -> data "Ferrumite Cannon")
const skorpius = admech.units.find((u) => u.name === 'Skorpius Disintegrator');
assert.equal(getUnitPoints(skorpius, 1, 1, { 'Ferrumite cannon': 1 }), 170, 'case-drifted wargear priced');
assert.equal(getUnitPoints(skorpius, 1, 1, { 'Ferrumite cannon': 3 }), 190, 'count still multiplies');
assert.ok(!admech.units.find((u) => u.name === 'Skitarii Rangers').wargearOptions, 'rangers have no wargear option');

// 11. Real New Recruit export shape: force-level characters, detachment, enhancements, groups
const nrXml = `<roster gameSystemId="${SYSTEM_11E}"><forces><force name="NR Test"><selections>` +
  `<selection type="upgrade" name="Battle Size"><selections><selection type="upgrade" name="Strike Force (2000 Point limit)" number="1" group="Battle Size"/></selections></selection>` +
  `<selection type="upgrade" name="Detachment"><selections><selection type="upgrade" name="Eradication Cohort" number="1" group="Detachments"/></selections></selection>` +
  `<selection type="upgrade" name="Force Disposition"><selections><selection type="upgrade" name="Purge the Foe" group="Force Disposition"/></selections></selection>` +
  `<selection type="model" name="Belisarius Cawl" number="1"><selections>` +
  `<selection type="upgrade" name="Warlord" number="1"/>` +
  `<selection type="upgrade" name="Mechadendrite hive" number="1" group="Wargear"/>` +
  `</selections></selection>` +
  `<selection type="model" name="Skitarii Marshal" number="1"><selections>` +
  `<selection type="upgrade" name="Omnissiah's Fury" number="1" group="Enhancements::Eradication Cohort Enhancements"/>` +
  `<selection type="upgrade" name="Control stave" number="1" group="Wargear"/>` +
  `</selections></selection>` +
  `<selection type="model" name="Tech-Priest Manipulus" number="1"><selections>` +
  `<selection type="upgrade" name="Belicosa-class Capacitor Vanes" number="1" group="Enhancements::Eradication Cohort Enhancements"/>` +
  `</selections></selection>` +
  `<selection type="unit" name="Skitarii Rangers"><selections>` +
  `<selection type="model" name="Skitarii Ranger w/ galvanic rifle" number="10"><selections>` +
  `<selection type="upgrade" name="Close combat weapon" number="10"/>` +
  `<selection type="upgrade" name="Galvanic rifle" number="10" group="Ranged weapon"/>` +
  `</selections></selection>` +
  `</selections></selection>` +
  `<selection type="model" name="Skorpius Disintegrator" number="1"><selections>` +
  `<selection type="upgrade" name="Armoured hull" number="1" group="Wargear"/>` +
  `<selection type="upgrade" name="Cognis heavy stubber" number="3" group="Wargear"/>` +
  `<selection type="upgrade" name="Disruptor missile launcher" number="1" group="Wargear"/>` +
  `<selection type="upgrade" name="Ferrumite cannon" number="1" group="Wargear::equipped with"/>` +
  `</selections></selection>` +
  `</selections></force></forces></roster>`;
const nr = rosToArmy(nrXml, getData);
assert.equal(nr.name, 'NR Test');
assert.equal(nr.faction, 'adeptus-mechanicus', 'default faction (no category in fixture)');
assert.equal(nr.pointLimit, 2000, 'pointLimit from Battle Size');
const nrNames = nr.units.map((u) => u.unitName);
assert.deepEqual(nrNames, ['Belisarius Cawl', 'Skitarii Marshal', 'Tech-Priest Manipulus', 'Skitarii Rangers', 'Skorpius Disintegrator'], 'force-level models become units, in order');
assert.deepEqual(nr.detachments, [{ name: 'ERADICATION COHORT', enhancements: ['Omnissiah’s Fury', 'Belicosa-class Capacitor Vanes'] }], 'detachment + enhancements resolve to data names');
// wargear: only Wargear-grouped upgrades; weapon options and config upgrades excluded
assert.deepEqual(nr.units[0].wargear, { 'Mechadendrite hive': 1 });
assert.deepEqual(nr.units[1].wargear, { 'Control stave': 1 });
assert.deepEqual(nr.units[2].wargear, {});
assert.deepEqual(nr.units[3].wargear, {}, 'ungrouped + Ranged weapon upgrades not wargear');
assert.deepEqual(nr.units[4].wargear, { 'Armoured hull': 1, 'Cognis heavy stubber': 3, 'Disruptor missile launcher': 1, 'Ferrumite cannon': 1 });
// app-side total: units + normed wargear + enhancements = 220+35+60+85+(160+10)+35 = 605
const armyTotal = (a, data) => {
  const ord = {};
  let t = 0;
  for (const u of a.units) {
    const ud = data.units.find((d) => d.name === u.unitName);
    ord[u.unitName] = (ord[u.unitName] || 0) + 1;
    if (ud) t += getUnitPoints(ud, u.modelCount, ord[u.unitName], u.wargear);
  }
  const enh = (a.detachments || []).reduce((s, d) => s + (d.enhancements || []).reduce((s2, n) => s2 + (data.detachments.find((x) => x.name === d.name)?.enhancements.find((e) => e.name === n)?.pts || 0), 0), 0);
  return t + enh;
};
assert.equal(armyTotal(nr, admech), 605, 'fixture: app total (units + normed wargear + enhancements)');

// 12. Live NR file (skipped when absent): the original regression input, 1995 pts
const live = '/mnt/g/DownloadEdge/Remove That Direction 2k.rosz';
if (existsSync(live)) {
  const entry = Object.values(unzipSync(readFileSync(live)))[0];
  const a = rosToArmy(new TextDecoder().decode(entry), getData);
  const names = a.units.map((u) => u.unitName);
  assert.equal(a.units.length, 16, 'live: 10 unit entries (2 duplicated in NR export) + 6 force-level models');
  for (const n of ['Belisarius Cawl', 'Skitarii Marshal', 'Tech-Priest Manipulus', 'Skorpius Disintegrator']) assert.ok(names.includes(n), `live: ${n}`);
  assert.equal(names.filter((n) => n === 'Skorpius Disintegrator').length, 3);
  assert.equal(a.pointLimit, 2000, 'live: pointLimit');
  assert.deepEqual(a.detachments, [{ name: 'ERADICATION COHORT', enhancements: ['Omnissiah’s Fury', 'Belicosa-class Capacitor Vanes'] }], 'live: detachment + enhancements');
  assert.ok(!a.units.some((u) => Object.keys(u.wargear).some((w) => /close combat|combat weapon/i.test(w))), 'live: weapon options not wargear');
  assert.equal(armyTotal(a, admech), 1995, 'live: matches NR total');
  console.log('live .rosz check passed (1995/2000 pts, 16 units, 1 detachment)');
} else {
  console.log('live .rosz check skipped (file absent)');
}

console.log('yellowscribe: all checks passed');
