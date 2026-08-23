// YellowScribe / New Recruit interop.
// Export: army -> .ros XML -> .rosz (zip). Import: .ros/.rosz -> army.
// Phase 2: 8-hex TTS codes via a user-deployed relay (PROXY).
import { zipSync } from 'fflate';
import { load } from 'cheerio';

// ponytail: empty = code buttons hidden; paste your relay worker URL to enable
export const PROXY = '';

const SYSTEM_ID_11E = 'sys-352e-adc2-7639-d610';

// Inverse of the display-name transform used in ArmySetup (key -> "Name").
export const factionDisplayName = (key) =>
  key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const FACTION_ALIASES = {
  eldar: 'aeldari',
  "emperor's children": 'emperors-children',
  "t'au empire": 'tau-empire',
};

export function factionKeyFromName(name) {
  const n = String(name || '').trim().replace(/^faction:\s*/i, '').toLowerCase();
  if (FACTION_ALIASES[n]) return FACTION_ALIASES[n];
  return n.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function armyToRos(army) {
  const units = (army.units || [])
    .map((u) => {
      const upgrades = Object.entries(u.wargear || {})
        .filter(([, count]) => count > 0)
        .map(([name, count]) =>
          `          <selection type="upgrade" name="${esc(name)}" number="${count}"/>`)
        .join('\n');
      let models = '';
      if (u.modelCount > 0) {
        models = `      <selections>\n        <selection type="model" name="${esc(u.unitName)}" number="${u.modelCount}">\n${upgrades ? `          <selections>\n${upgrades}\n          </selections>\n` : ''}        </selection>\n      </selections>\n`;
      }
      return `    <selection type="unit" name="${esc(u.unitName)}">\n${models}      <categories>\n        <category name="Faction: ${esc(factionDisplayName(army.faction))}"/>\n      </categories>\n    </selection>`;
    })
    .join('\n');
  return `<roster gameSystemId="${SYSTEM_ID_11E}">\n  <forces>\n    <force name="${esc(army.name || '')}">\n      <selections>\n${units}\n      </selections>\n    </force>\n  </forces>\n</roster>\n`;
}

export function armyToRozs(army) {
  return zipSync({ 'army.ros': new TextEncoder().encode(armyToRos(army)) });
}

export function rosToArmy(xml) {
  const $ = load(xml, { xmlMode: true });
  const systemId = $('roster').attr('gameSystemId');
  if (systemId !== SYSTEM_ID_11E) {
    throw new Error(`not an 11e roster (gameSystemId: ${systemId || 'missing'}, 11e is ${SYSTEM_ID_11E})`);
  }
  const units = [];
  let name = '';
  let faction = '';
  $('forces > force').each((i, force) => {
    const f = $(force);
    if (!name) name = f.attr('name') || '';
    if (!faction) faction = f.attr('faction') || '';
    f.children('selections').children('selection[type="unit"]').each((_, el) => {
      const sel = $(el);
      let modelCount = 0;
      const wargear = {};
      sel.children('selections').children('selection[type="model"]').each((_, mEl) => {
        modelCount += Number($(mEl).attr('number') || 0);
        $(mEl).children('selections').children('selection[type="upgrade"]').each((_, wEl) => {
          const w = $(wEl);
          const wName = w.attr('name') || '?';
          wargear[wName] = (wargear[wName] || 0) + Number(w.attr('number') || 0);
        });
      });
      units.push({
        id: crypto.randomUUID(),
        unitName: sel.attr('name') || 'Unknown unit',
        modelCount,
        wargear: Object.keys(wargear).length ? wargear : {},
      });
    });
  });
  if (!faction) {
    $('category').each((_, cEl) => {
      const cName = $(cEl).attr('name') || '';
      if (/^faction:/i.test(cName)) faction = cName.replace(/^faction:\s*/i, '');
    });
  }
  return {
    name: name || 'Imported Army',
    faction: factionKeyFromName(faction) || 'adeptus-mechanicus',
    // ponytail: fixed default, user adjusts on the setup screen after import
    pointLimit: 2000,
    detachments: [],
    units,
  };
}

// Phase 2 input: JSON stored by yellowscribe.link (verified shape, 11e):
//   { edition: "11e", order: [uuid, ...], armyData: { uuid: unitData }, baseScript, ... }
//   unitData: { name, factionKeywords, models: { totalNumberOfModels }, ... }
// No army name or wargear is stored server-side.
export function armyDataToArmy(stored) {
  const edition = String(stored?.edition || '');
  if (edition && !edition.includes('11')) throw new Error(`that code is ${edition}, not 11e`);
  let src = stored?.armyData;
  if (src && !Array.isArray(src) && src.units) src = Array.isArray(src.units) ? src.units : Object.values(src.units);
  const list = Array.isArray(stored?.order)
    ? stored.order.map((id) => (src?.[id] ?? null)).filter(Boolean)
    : Array.isArray(src) ? src : Object.values(src ?? {});
  const faction = list.map((u) => u?.factionKeywords?.[0]).find(Boolean) || list.map((u) => u?.faction?.[0]).find(Boolean) || '';
  return {
    name: 'Imported Army',
    faction: factionKeyFromName(faction) || 'adeptus-mechanicus',
    pointLimit: 2000,
    detachments: [],
    units: list.map((u) => ({
      id: crypto.randomUUID(),
      unitName: u?.name || 'Unknown unit',
      modelCount: u?.models?.totalNumberOfModels ?? (typeof u?.models === 'number' ? u.models : 0),
      wargear: {},
    })),
  };
}

export async function getYellowScribeCode(army) {
  const res = await fetch(`${PROXY}/code`, { method: 'POST', body: armyToRozs(army) });
  if (!res.ok) throw new Error(`yellowscribe relay failed (${res.status})`);
  const { code } = await res.json();
  if (!code) throw new Error('relay returned no code');
  return code;
}

export async function armyFromCode(code) {
  const res = await fetch(`${PROXY}/army?id=${encodeURIComponent(code.trim())}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'code not found (codes expire after ~10 min)' : `yellowscribe relay failed (${res.status})`);
  return armyDataToArmy(await res.json());
}
