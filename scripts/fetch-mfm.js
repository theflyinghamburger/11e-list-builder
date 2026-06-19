import * as cheerio from 'cheerio';

const URL = process.argv[2];

if (!URL) {
  console.error('Usage: node scripts/fetch-mfm.js <mfm-url>');
  console.error('Example: node scripts/fetch-mfm.js https://mfm.warhammer-community.com/en/necrons');
  process.exit(1);
}

async function main() {
  const response = await fetch(URL);
  const html = await response.text();
  const $ = cheerio.load(html);

  const detachments = [];
  const units = [];

  // Parse detachments
  $('h3.font-header').each((_, el) => {
    if ($(el).text().trim() !== 'DETACHMENTS') return;

    const grid = $(el).next('.grid');
    if (!grid.length) return;

    grid.find('.flex.flex-col.space-y-1').each((_, card) => {
      const header = $(card).find('.flex.flex-row.justify-between').first();
      if (!header.length) return;

      const spans = header.find('span');
      const name = spans.eq(0)?.text().trim().toUpperCase() || '';
      const dpText = spans.eq(1)?.text().trim() || '';
      const dpCost = parseInt(dpText.replace('DP', ''), 10) || 0;

      const doctrineEl = $(card).find('.m-0.px-1.py-0\\.5.text-white.font-bold').first();
      const doctrine = doctrineEl.text().trim() || '';

      const enhancements = [];
      $(card).find('ul.leaders li').each((_, li) => {
        const row = $(li).find('.flex.flex-row.justify-between');
        if (!row.length) return;

        const parts = row.find('span');
        const enhName = parts.eq(0)?.text().trim() || '';
        const ptsText = parts.eq(1)?.text().trim() || '';
        const pts = parseInt(ptsText.replace('pts', '').trim(), 10) || 0;

        if (enhName && pts) {
          enhancements.push({ name: enhName, pts });
        }
      });

      detachments.push({ name, dpCost, doctrine, enhancements });
    });
  });

  // Parse units
  $('h3.font-header').each((_, el) => {
    if ($(el).text().trim() !== 'UNITS') return;

    const container = $(el).next();
    if (!container.length) return;

    container.find('.flex.flex-col.space-y-1.m-1').each((_, card) => {
      const nameEl = $(card).find('.bg-slate-500.font-bold.text-xl.text-white').first();
      const name = nameEl.text().trim();
      if (!name) return;

      const modelCounts = [];
      $(card).find('ul.leaders li span').each((_, span) => {
        const text = $(span).text().trim();
        const match = text.match(/(\d+)\s*model/);
        if (match) {
          modelCounts.push(parseInt(match[1], 10));
        }
      });

      const unit = { name, modelOptions: [] };

      if (modelCounts.length) {
        unit.modelOptions = modelCounts.map(count => ({
          count,
          cost: 0, // MFM calculates costs dynamically - fill from codex
        }));
      }

      // Check for leader relationships
      let leaderText = '';
      $(card).find('.font-bold').each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes('LEADER:')) {
          leaderText = text;
        }
      });

      if (leaderText) {
        const leaderNames = leaderText
          .replace('LEADER:', '')
          .split(',')
          .map(s => s.trim().toUpperCase())
          .filter(Boolean);
        unit.leaderOf = leaderNames;
      }

      // Check for support relationships
      let supportText = '';
      $(card).find('.font-bold').each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes('SUPPORT:')) {
          supportText = text;
        }
      });

      if (supportText) {
        const supportNames = supportText
          .replace('SUPPORT:', '')
          .split(',')
          .map(s => s.trim().toUpperCase())
          .filter(Boolean);
        unit.supportFor = supportNames;
      }

      units.push(unit);
    });
  });

  const output = { detachments, units };
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
