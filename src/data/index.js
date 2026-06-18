import admech from './adeptus-mechanicus.json';
import iknights from './imperial-knights.json';

const STORAGE_KEY = 'custom-factions';

const factions = { 'adeptus-mechanicus': admech, 'imperial-knights': iknights };

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
