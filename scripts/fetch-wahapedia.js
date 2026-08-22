// Scrape Wahapedia datasheets into src/data/datasheets/<folder>.json chunks.
// Chunk files are keyed by UPPER unit name (MFM names), resumable across runs.
// Usage:
//   node scripts/fetch-wahapedia.js                  # all factions
//   node scripts/fetch-wahapedia.js <faction-key>    # one faction
//   node scripts/fetch-wahapedia.js --force <key>    # re-fetch even if present
import * as cheerio from 'cheerio';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'data');
const outDir = join(dataDir, 'datasheets');
const BASE = 'https://wahapedia.ru/wh40k11ed/factions';

// Repo faction key → Wahapedia folder. Chapter factions share the space-marines folder.
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

// MFM name → Wahapedia slug where the two disagree (shared titan datasheets).
// Add further mismatches here as the sweep finds them, then re-run.
const OVERRIDES = {
  'chaos-titan-legions': {
    'Chaos Reaver Titan': 'Reaver-Titan',
    'Chaos Warbringer Nemesis Titan': 'Warbringer-Nemesis-Titan',
    'Chaos Warhound Titan': 'Warhound-Titan',
    'Chaos Warlord Titan': 'Warlord-Titan',
  },
  'aeldari': {
    'Vyper': 'Vypers',
  },
  'death-guard': {
    'Myphitic Blight-Haulers': 'Myphitic-Blight-hauler',
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const collapse = (s) => s.replace(/\s+/g, ' ').trim();

// Upper, drop punctuation/spacing — symmetric on MFM names and Wahapedia listings.
function normalize(name) {
  return name.toUpperCase().replace(/[’'.,\-\s]+/g, '');
}

// Keyword blocks: "KEYWORDS: INFANTRY; BATTLELINE; …" / "FACTION KEYWORDS: X" —
// nesting varies by unit, so split the collapsed text on ";" instead of walking spans.
function keywordText(el, $) {
  const text = collapse($(el).text()).replace(/^[A-Z ]*KEYWORDS:\s*/, '');
  return text ? text.split(';').map((s) => s.trim()).filter(Boolean) : [];
}

// "Mechanicus pistol <kw>devastating wounds</kw> <kw>pistol</kw>" →
// "Mechanicus pistol (devastating wounds, pistol)"
function weaponName($td, $) {
  const rootSpan = $td.children('span').first();
  if (!rootSpan.length) return collapse($td.text());
  let base = '';
  const kws = [];
  rootSpan.contents().each((_, node) => {
    if (node.type === 'text') base += node.data;
    else if (node.type === 'tag' && $(node).hasClass('kwbw')) kws.push(collapse($(node).text()));
  });
  base = collapse(base);
  return kws.length ? `${base} (${kws.join(', ')})` : base;
}

// A single table.wTable holds several groups; each row with a td.wTable_WEAPON
// title starts a new group (RANGED WEAPONS, MELEE WEAPONS, transport…).
function parseProfiles(ds, $) {
  const profiles = [];
  ds.find('table.wTable').each((_, tbl) => {
    let current = null;
    $(tbl).find('tr').each((_, tr) => {
      const $tr = $(tr);
      const titleTd = $tr.children('td.wTable_WEAPON');
      if (titleTd.length) {
        current = {
          title: collapse(titleTd.find('.dsHeader').first().text()) || 'PROFILES',
          headers: $tr.find('.ct').map((_, e) => $(e).text().trim()).get().filter(Boolean),
          rows: [],
        };
        profiles.push(current);
        return;
      }
      if (!current || !$tr.children('.wTable2_short').length) return;
      const tds = $tr.children('td').toArray();
      const nameIdx = tds.findIndex((td) => $(td).hasClass('wTable2_short'));
      if (nameIdx < 0) return;
      const row = { name: weaponName($tr.children('.wTable2_short').first(), $) };
      tds.slice(nameIdx + 1).forEach((td, i) => {
        const h = current.headers[i] ? current.headers[i].toLowerCase() : `col${i}`;
        row[h] = collapse($(td).text());
      });
      current.rows.push(row);
    });
  });
  return profiles;
}

function parseDatasheet($, url, slug) {
  const ds = $('.dsOuterFrame.datasheet').first();
  if (!ds.length) return null;
  const name = ds.find('.dsH2Header > div').first().text().trim();
  if (!name) return null;

  const d = { slug, url };

  const baseSpan = ds.find('.dsH2Header .dsModelBase2').first();
  if (baseSpan.length) {
    const m = collapse(baseSpan.text()).match(/⌀\s*(\d+\s*mm)/);
    if (m) d.base = m[1];
    const note = collapse(baseSpan.find('.dsBaseSizeComment').first().text());
    if (note) d.baseNote = note;
  }

  const keywords = keywordText(ds.children('.ds2colKW').children('div').first(), $);
  if (keywords.length) d.keywords = keywords;
  const factionKeywords = keywordText(ds.children('.ds2colKW').children('div').last(), $);
  if (factionKeywords.length) d.factionKeywords = factionKeywords;

  const chars = {};
  ds.find('.dsCharWrap').each((_, el) => {
    const k = $(el).find('.dsCharName').text().trim();
    const v = collapse($(el).find('.dsCharValue').first().text());
    if (k && v) chars[k] = v;
  });
  const inv = collapse(ds.find('.dsCharInvulValue').first().text());
  if (inv) chars.INSV = inv;
  if (Object.keys(chars).length) d.characteristics = chars;

  const profiles = parseProfiles(ds, $);
  if (profiles.length) d.profiles = profiles;

  const wgHdr = ds.find('div:has(> span.dsWargearOptionsIcon)').first();
  if (wgHdr.length) {
    const wargear = [];
    // nested ul (e.g. "one of the following: …") → parent line first, sub-items as their own entries
    const walk = (ul) => {
      ul.children('li').each((_, li) => {
        const $li = $(li);
        const own = $li.clone();
        own.find('ul').remove();
        const t = collapse(own.text());
        if (t) wargear.push(t);
        $li.find('> ul').each((_, n) => walk($(n)));
      });
    };
    walk(wgHdr.next('ul'));
    const comment = collapse(wgHdr.nextAll('.dsOptionsComment').first().text());
    if (comment) wargear.push(comment);
    if (wargear.length) d.wargear = wargear;
  }

  // Right column of the first .ds2col: ABILITIES / WARGEAR ABILITIES / UNIT COMPOSITION / costs table
  const right1 = ds.children('.ds2col').first().children('div').last();
  const abilities = [];
  const wargearAbilities = [];
  const composition = [];
  const costs = [];
  let section = '';
  right1.children().each((_, el) => {
    const $el = $(el);
    if ($el.hasClass('dsHeader')) {
      section = $el.text().trim().toUpperCase();
      return;
    }
    if (!$el.hasClass('dsAbility')) return;
    if ($el.find('.dsUnitCostHeader').length) {
      $el.find('table').find('tr').each((_, tr) => {
        const $tr = $(tr);
        if ($tr.find('.dsUnitCostHeader').length) return;
        const label = collapse($tr.children('td').first().text());
        const pts = parseInt(collapse($tr.find('.PriceTag').first().text()), 10);
        if (label && !isNaN(pts)) costs.push({ label, pts });
      });
      return;
    }
    if ($el.find('ul.dsUl').length) {
      $el.find('ul.dsUl li').each((_, li) => composition.push(collapse($(li).text())));
      const rest = $el.clone();
      rest.find('ul.dsUl').remove();
      const restTxt = collapse(rest.text());
      if (restTxt) composition.push(restTxt);
      return;
    }
    const txt = collapse($el.text());
    if (!txt) return;
    if (section === 'ABILITIES') abilities.push(txt);
    else if (section === 'WARGEAR ABILITIES') wargearAbilities.push(txt);
    else if (section === 'UNIT COMPOSITION') composition.push(txt);
  });
  if (abilities.length) d.abilities = abilities;
  if (wargearAbilities.length) d.wargearAbilities = wargearAbilities;
  if (composition.length) d.composition = composition;
  if (costs.length) d.costs = costs;

  // Second .ds2col: STRATAGEMS (left), LED BY / SUPPORTED BY / DETACHMENT ABILITY (right)
  const feat = ds.children('.ds2col').eq(1);
  const stratagems = [];
  feat.children('div').first().find('.s10Wrap').each((_, el) => {
    const $el = $(el);
    const nameEl = $el.find('.s10Name').first();
    const sName = collapse(nameEl.text());
    if (!sName) return;
    const cp = parseInt(collapse(nameEl.next().text()), 10) || 0;
    stratagems.push({ name: sName, cp, source: collapse($el.find('.s10Type').first().text()) });
  });
  if (stratagems.length) d.stratagems = stratagems;

  const featRight = feat.children('div').last();
  const ledBy = [];
  const supportedBy = [];
  let fSection = '';
  featRight.children().each((_, el) => {
    const $el = $(el);
    if ($el.hasClass('dsHeader')) {
      fSection = $el.text().trim().toUpperCase();
      return;
    }
    if (!$el.hasClass('dsAbility')) return;
    if (fSection === 'LED BY') $el.find('a.kwbOne').each((_, a) => ledBy.push(collapse($(a).text())));
    else if (fSection === 'SUPPORTED BY') $el.find('a.kwbOne').each((_, a) => supportedBy.push(collapse($(a).text())));
  });
  // DETACHMENT ABILITY is wrapped in a plain <div>, so grab the chips directly
  const detAbilities = [];
  featRight.find('.s10EnhWrap').each((_, e) => detAbilities.push(collapse($(e).text())));
  if (ledBy.length) d.ledBy = ledBy;
  if (supportedBy.length) d.supportedBy = supportedBy;
  if (detAbilities.length) d.detachmentAbilities = detAbilities;

  // ponytail: sanity gate — a real datasheet always has at least one of these
  if (!d.profiles?.length && !d.abilities?.length && !d.stratagems?.length) return null;
  return d;
}

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

async function processFaction(key) {
  const data = JSON.parse(readFileSync(join(dataDir, `${key}.json`), 'utf8'));
  const folder = FOLDER_FOR[key] ?? key;
  const chunkPath = join(outDir, `${folder}.json`);
  const chunk = existsSync(chunkPath) ? JSON.parse(readFileSync(chunkPath, 'utf8')) : {};

  const listHtml = await fetchText(`${BASE}/${folder}/armylist.html`);
  if (!listHtml) throw new Error(`${folder}: armylist.html not found`);
  const $list = cheerio.load(listHtml);
  const slugByNorm = {};
  $list('a.cnClr').each((_, a) => {
    const name = $list(a).text().trim();
    const slug = $list(a).attr('href').split('/').pop();
    if (name && slug) slugByNorm[normalize(name)] = slug;
  });

  const jobs = data.units.map((u) => ({
    unit: u,
    slug: OVERRIDES[key]?.[u.name] || slugByNorm[normalize(u.name)],
  }));

  let fetched = 0;
  let skipped = 0;
  const missing = [];
  const failed = [];
  await pool(jobs, 4, async ({ unit, slug }) => {
    const chunkKey = unit.name.toUpperCase();
    if (chunk[chunkKey] && !force) {
      skipped++;
      return;
    }
    if (!slug) {
      missing.push(unit.name);
      return;
    }
    await sleep(250);
    const url = `${BASE}/${folder}/${slug}`;
    const html = await fetchText(url);
    if (html === null) {
      failed.push(`${unit.name} (404: ${slug})`);
      return;
    }
    const parsed = parseDatasheet(cheerio.load(html), url, slug);
    if (!parsed) {
      failed.push(`${unit.name} (empty parse: ${slug})`);
      return;
    }
    chunk[chunkKey] = parsed;
    fetched++;
  });

  const sorted = {};
  for (const k of Object.keys(chunk).sort()) sorted[k] = chunk[k];
  mkdirSync(outDir, { recursive: true });
  writeFileSync(chunkPath, JSON.stringify(sorted, null, 2) + '\n');
  console.log(
    `${key} → ${folder}: fetched ${fetched}, skipped ${skipped}, ` +
    `missing ${missing.length}${missing.length ? ` (${missing.join(', ')})` : ''}` +
    `(failed ${failed.length}${failed.length ? `: ${failed.join('; ')}` : ''})`,
  );
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

(async () => {
  for (const key of selected) await processFaction(key);
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
