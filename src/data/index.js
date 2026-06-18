import admech from './adeptus-mechanicus.json';

const factions = { 'adeptus-mechanicus': admech };

export function getData(key) {
  return factions[key];
}

export function getFactionKeys() {
  return Object.keys(factions);
}
