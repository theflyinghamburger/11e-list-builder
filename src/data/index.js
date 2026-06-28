import admech from './adeptus-mechanicus.json';
import iknights from './imperial-knights.json';
import necrons from './necrons.json';
import bloodAngels from './blood-angels.json';
import darkAngels from './dark-angels.json';
import deathGuard from './death-guard.json';
import orks from './orks.json';
import spaceMarines from './space-marines.json';
import tauEmpire from './tau-empire.json';
import thousandSons from './thousand-sons.json';
import tyranids from './tyranids.json';
import worldEaters from './world-eaters.json';

const STORAGE_KEY = 'custom-factions';

const factions = {
  'adeptus-mechanicus': admech,
  'imperial-knights': iknights,
  'necrons': necrons,
  'blood-angels': bloodAngels,
  'dark-angels': darkAngels,
  'death-guard': deathGuard,
  'orks': orks,
  'space-marines': spaceMarines,
  'tau-empire': tauEmpire,
  'thousand-sons': thousandSons,
  'tyranids': tyranids,
  'world-eaters': worldEaters,
};

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  for (const [key, entry] of Object.entries(saved)) {
    factions[key] = entry.data;
  }
} catch { /* corrupt data, ignore */ }

export function getData(key) {
  return factions[key];
}

export function getFactionKeys() {
  return Object.keys(factions);
}

export function addFaction(key, data) {
  if (!data || !Array.isArray(data.detachments) || !Array.isArray(data.units)) {
    return { ok: false, reason: 'Invalid format: must have detachments[] and units[]' };
  }
  if (key.includes('/') || key.includes('\\')) {
    return { ok: false, reason: 'Key must not contain slashes' };
  }
  factions[key] = data;
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  saved[key] = { data, timestamp: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  return { ok: true };
}
