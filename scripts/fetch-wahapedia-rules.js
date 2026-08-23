// Scrape Wahapedia faction rule pages (army rules, detachment rules,
// enhancements text, stratagems, errata) into src/data/rules/<folder>.json.
// One file per Wahapedia folder; chapters share the space-marines folder.
// Out of scope by design: Crusade Rules, Boarding Actions.
// Usage:
//   node scripts/fetch-wahapedia-rules.js                  # all folders
//   node scripts/fetch-wahapedia-rules.js <faction-key>    # one faction
//   node scripts/fetch-wahapedia-rules.js --force <key>    # re-fetch even if present
import * as cheerio from 'cheerio';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');
const outDir = join(dataDir, 'rules');
const BASE = 'https://wahapedia.ru/wh40k11ed/factions';

// Ponytail: helpers + FOLDER_FOR copied from scripts/fetch-wahapedia.js rather than refactored.
const FOLDER_FOR = {
  'blood-angels': 'space-marines',
  'dark-angels': 'space-marines',
  'black-templars': 'space-marines',
  'deathwatch': 'space-marines',
  'space-wolves': 'space-marines',
  'titan-legions': 'adeptus-titanicus',
  'chaos-titan-legions': 'adeptus-titanicus',
  'tau-empire': 't-au-empire',
  'emperors-children': 'emperor-s-children',
  // ponytail: every other key is its own folder
};

// MFM name → Wahapedia detachment name where the two disagree; output is
// keyed by the MFM name so saved-army lookup matches.
const DET_OVERRIDES = {
  'genestealer-cults': { 'Brood Brothers Auxilia': 'Brood Brother Auxilia' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

// Upper, drop punctuation/spacing — symmetric on MFM and Wahapedia names.
function normalize(name) {
  return name.toUpperCase().replace(/[’'.,\-\s]+/g, '');
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Element text with <br> as line breaks, one collapsed line per paragraph.
function blockText($el) {
  const c = $el.clone();
  c.find('br').replaceWith('\n');
  return c.text()
    .split('\n')
    .map((l) => collapse(l))
    .filter(Boolean)
    .join('\n');
}

function parseStratagem($el, detName) {
  const name = $el.find('.str11Name').first().text().trim();
  const cp = parseInt(($el.find('.str11CP').first().text().match(/(\d+)\s*CP/i) || [])[1], 10) || 0;
  const type = collapse($el.find('.str11Type').first().text());
  let kind = type;
  if (detName && type.toLowerCase().startsWith(detName.toLowerCase())) {
    kind = type.slice(detName.length).replace(/^[\s–—\-:]+/, '');
  }
  kind = kind.replace(/\s*stratagems?$/i, '').trim() || type;
  const flavor = collapse($el.find('.str11Legend').first().text());
  return { name, cp, kind, flavor, text: blockText($el.find('.str11Text').first()) };
}

function parseErrata($body, $) {
  const out = [];
  $body.find('.errata').each((_, el) => {
    const $el = $(el);
    const scope = collapse($el.closest('.BreakInsideAvoid').find('.errata_H').first().text());
    const text = blockText($el);
    if (text) out.push({ scope, text });
  });
  return out;
}

function parseEnhancement($td, $) {
  const li = $td.find('ul.EnhancementsPts li').first();
  // Name span may embed an UPGRADE tag span — exclude it.
  const $nameSpan = $(li).find('span').first().clone();
  $nameSpan.find('.EnhUpgrade').remove();
  const name = collapse($nameSpan.text());
  const flavor = collapse($td.find('p.legend2').first().text());
  const c = $td.clone();
  c.find('ul.EnhancementsPts, p.legend2').remove();
  return { name, flavor, text: blockText(c) };
}

function parsePage(html, url) {
  const $ = cheerio.load(html);
  $('script').remove();
  const result = { source: url, armyRules: [], detachments: {} };
  const st = { top: null, sub: '', det: null, armyEntry: null, detEntry: null, stray: [] };
  const warns = [];

  const line = (t) => {
    if (!t || st.top === 'stop') return;
    let entry = null;
    if (st.top === 'army') {
      if (!st.armyEntry) {
        st.armyEntry = { name: null, textLines: [], errata: [] };
        result.armyRules.push(st.armyEntry);
      }
      entry = st.armyEntry;
    } else if (st.top === 'det' && (st.sub === 'rules' || st.sub === 'other')) {
      if (!st.detEntry) {
        st.detEntry = { name: null, textLines: [], errata: [] };
        st.det.rules.push(st.detEntry);
      }
      entry = st.detEntry;
    } else if (st.top === 'det') {
      st.stray.push(t);
      return;
    } else return;
    t.split('\n').forEach((l) => entry.textLines.push(l));
  };

  const onH2 = (text, $el) => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (/^crusade rules$|^boarding actions$/i.test(t)) { st.top = 'stop'; return; }
    if (/^army rules$/i.test(t)) { st.top = 'army'; st.armyEntry = null; return; }
    if ($el.find('span.dpPts').length) {
      const name = collapse($el.clone().find('span.dpPts').remove().end().text());
      if (!name) return;
      st.top = 'det';
      st.sub = '';
      st.detEntry = null;
      st.det = { name, rules: [], enhancements: [], stratagems: [], errata: [] };
      result.detachments[name] = st.det;
      return;
    }
    if (st.top === 'det') {
      if (/detachment rules?/i.test(t)) { st.sub = 'rules'; st.detEntry = null; return; }
      if (/enhancements/i.test(t)) { st.sub = 'enhancements'; return; }
      if (/^stratagems$/i.test(t)) { st.sub = 'stratagems'; return; }
      if (/^faq$/i.test(t)) { st.sub = 'faq'; return; }
      // Detachment sub-heading (e.g. "Necrodermal Binding Abilities", "Extremis Abilities")
      st.sub = 'other';
    }
  };

  const walk = (el) => {
    const $el = $(el);
    const tag = el.tagName;
    if (tag === 'hr' || tag === 'br') return;
    if ($el.hasClass('str11Wrap')) {
      if (!st.det) { warns.push(`stratagem outside detachment: ${$el.find('.str11Name').first().text().trim()}`); return; }
      st.det.stratagems.push(parseStratagem($el, st.det.name));
      return;
    }
    // Absorb the whole spoiler (head carries a "Show" toggle button).
    if ($el.hasClass('faqErrataSpoiler') || $el.hasClass('faqErrataSpoilerBody')) {
      const err = parseErrata($el, $);
      const pool = st.top === 'army'
        ? (st.armyEntry || (() => {
            st.armyEntry = { name: null, textLines: [], errata: [] };
            result.armyRules.push(st.armyEntry);
            return st.armyEntry;
          })()).errata
        : (st.top === 'det' && st.sub === 'rules' && st.detEntry ? st.detEntry.errata : st.det?.errata);
      pool.push(...err);
      return;
    }
    if (tag === 'h2') {
      onH2($el.text(), $el);
      return;
    }
    if (tag === 'h3' || tag === 'h4') {
      const t = collapse($el.text());
      if (/^(errata|faq)$/i.test(t)) return;
      if (st.top === 'army') {
        st.armyEntry = { name: t, textLines: [], errata: [] };
        result.armyRules.push(st.armyEntry);
      } else if (st.top === 'det' && (st.sub === 'rules' || st.sub === 'other')) {
        st.detEntry = { name: t, textLines: [], errata: [] };
        st.det.rules.push(st.detEntry);
      }
      return;
    }
    if (tag === 'td' && $el.hasClass('td_w')) {
      if (st.top === 'det' && st.det && $el.find('ul.EnhancementsPts').length) {
        st.det.enhancements.push(parseEnhancement($el, $));
        return;
      }
      // Enhancement-style block inside a detachment — regardless of sub-heading
      if (st.top === 'det' && st.sub === 'enhancements') return;
      // Inline sub-rule block (e.g. Doctrina Imperatives entries)
      const name = collapse($el.find('p.impact18').first().text());
      if (name) line(name);
      const c = $el.clone();
      c.find('p.impact18').remove();
      line(blockText(c));
      return;
    }
    // leaf text block — except when it wraps a special block we must descend into
    if (!$el.find('p,ul,ol,li,table,h2,h3,h4,h5,h6,.str11Wrap,.faqErrataSpoiler').length) {
      line(blockText($el));
      return;
    }
    // Container: bare text children are their own block, element children recurse.
    for (const child of el.children || []) {
      if (child.type === 'text') line(collapse(child.data));
      else walk(child);
    }
  };

  $('body > *').each((_, el) => walk(el));

  const flush = (list) => {
    for (const e of list) {
      e.text = e.textLines.join('\n');
      delete e.textLines;
    }
  };
  flush(result.armyRules);
  for (const det of Object.values(result.detachments)) flush(det.rules);

  if (st.stray.length) warns.push(`stray text dropped: ${st.stray.length} blocks`);
  for (const det of Object.values(result.detachments)) {
    if (!det.rules.length) warns.push(`${det.name}: no detachment rules`);
  }
  const hasArmyH2 = $('h2#Army-Rules').length > 0;
  if (hasArmyH2 && !result.armyRules.some((e) => e.text.length)) warns.push('army rules empty despite section');

  return { result, warns };
}

// Helpers below mirror scripts/fetch-wahapedia.js.
async function fetchText(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (11e-list-builder wahapedia scraper)' } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(1000 * (attempt + 1));
    }
  }
}

async function pool(items, limit, fn) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const factionKeys = readdirSync(dataDir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
const selected = args.filter((a) => a !== '--force').length
  ? args.filter((a) => a !== '--force')
  : factionKeys;
for (const k of selected) {
  if (!factionKeys.includes(k)) {
    console.error(`unknown faction: ${k}`);
    process.exit(1);
  }
}

// Dedupe folders: shared pages (space-marines, adeptus-titanicus) fetched once.
const folders = [...new Map(selected.map((k) => [FOLDER_FOR[k] ?? k, k])).keys()];

const allMissing = [];

async function processFolder(folder) {
  const chunkPath = join(outDir, `${folder}.json`);
  if (existsSync(chunkPath) && !force) {
    console.log(`${folder}: skipped (exists, use --force)`);
    return;
  }
  const url = `${BASE}/${folder}/`;
  await sleep(250);
  const html = await fetchText(url);
  if (html === null) throw new Error(`${folder}: 404`);
  const { result, warns } = parsePage(html, url);
  for (const [mfm, wah] of Object.entries(DET_OVERRIDES[folder] || {})) {
    if (result.detachments[wah]) {
      result.detachments[mfm] = result.detachments[wah];
      delete result.detachments[wah];
    }
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(chunkPath, JSON.stringify(result, null, 2) + '\n');

  // Coverage: every MFM detachment for keys mapped to this folder must be present.
  const have = new Set(Object.keys(result.detachments).map(normalize));
  const missing = [];
  for (const k of factionKeys.filter((x) => (FOLDER_FOR[x] ?? x) === folder)) {
    const data = JSON.parse(readFileSync(join(dataDir, `${k}.json`), 'utf8'));
    for (const d of data.detachments || []) {
      if (!have.has(normalize(d.name))) missing.push(d.name);
    }
  }
  if (missing.length) allMissing.push(...missing.map((m) => `${folder}: ${m}`));
  const n = Object.values(result.detachments).reduce((s, d) => s + d.stratagems.length, 0);
  console.log(
    `${folder}: ${Object.keys(result.detachments).length} detachments, ${n} stratagems, ` +
    `${result.armyRules.length} army rules` +
    (warns.length ? ` — warns: ${warns.join('; ')}` : ''),
  );
}

(async () => {
  await pool(folders, 4, processFolder);
  if (allMissing.length) {
    console.error(`\nMFM detachments missing from rules files:\n  ${allMissing.join('\n  ')}`);
    process.exit(1);
  }
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
