import adeptusMechanicus from './adeptus-mechanicus.json';
import imperialKnights from './imperial-knights.json';
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
import adeptaSororitas from './adepta-sororitas.json';
import adeptusCustodes from './adeptus-custodes.json';
import aeldari from './aeldari.json';
import astraMilitarum from './astra-militarum.json';
import blackTemplars from './black-templars.json';
import chaosDaemons from './chaos-daemons.json';
import chaosTitanLegions from './chaos-titan-legions.json';
import chaosSpaceMarines from './chaos-space-marines.json';
import chaosKnights from './chaos-knights.json';
import deathwatch from './deathwatch.json';
import emperorsChildren from './emperors-children.json';
import imperialAgents from './imperial-agents.json';
import genestealerCults from './genestealer-cults.json';
import greyKnights from './grey-knights.json';
import leaguesOfVotann from './leagues-of-votann.json';
import spaceWolves from './space-wolves.json';
import titanLegions from './titan-legions.json';

const STORAGE_KEY = 'custom-factions';

const factions = {
  'adeptus-mechanicus': adeptusMechanicus,
  'imperial-knights': imperialKnights,
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
  'adepta-sororitas': adeptaSororitas,
  'adeptus-custodes': adeptusCustodes,
  'aeldari': aeldari,
  'astra-militarum': astraMilitarum,
  'black-templars': blackTemplars,
  'chaos-daemons': chaosDaemons,
  'chaos-titan-legions': chaosTitanLegions,
  'chaos-space-marines': chaosSpaceMarines,
  'chaos-knights': chaosKnights,
  'deathwatch': deathwatch,
  'emperors-children': emperorsChildren,
  'imperial-agents': imperialAgents,
  'genestealer-cults': genestealerCults,
  'grey-knights': greyKnights,
  'leagues-of-votann': leaguesOfVotann,
  'space-wolves': spaceWolves,
  'titan-legions': titanLegions,
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
