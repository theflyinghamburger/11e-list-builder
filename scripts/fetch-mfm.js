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

  // Build cost map: template ID (P:X) → cost in pts
  // MFM uses hidden divs with $RS() to map S:X → P:X
  const costMap = {};
  html.match(/\$RS\("S:([^"]+)",\s*"P:([^"]+)"\)/g)?.forEach(match => {
    const [, srcId, targetId] = match.match(/\$RS\("S:([^"]+)",\s*"P:([^"]+)"\)/);
    const srcDiv = $(`#S\\:${srcId}`);
    const ptsText = srcDiv.find('span').text().trim();
    const pts = parseInt(ptsText.replace('pts', '').trim(), 10);
    if (!isNaN(pts)) {
      costMap[`P:${targetId}`] = pts;
    }
  });

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

      // Doctrine is in a div with background-color style
      let doctrine = '';
      $(card).find('div[style*="background-color"]').each((_, el) => {
        const text = $(el).text().trim();
        if (text && !text.includes('DP') && text !== name) {
          doctrine = text;
        }
      });

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

      // Check for detachment-level leader/support
      const det = { name, dpCost, doctrine, enhancements };
      const leaderDiv = $(card).find('.mx-3.font-bold');
      if (leaderDiv.length) {
        const leaderText = leaderDiv.text().trim();
        if (leaderText.includes('LEADER:')) {
          det.leaderOf = leaderText
            .replace('LEADER:', '')
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);
        } else if (leaderText.includes('SUPPORT:')) {
          det.supportFor = leaderText
            .replace('SUPPORT:', '')
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);
        }
      }

      detachments.push(det);
    });
  });

  // Parse units - all cards with unit name headers on the page
  $('.flex.flex-col.space-y-1.m-1').each((_, card) => {
      const nameEl = $(card).find('.bg-slate-500.font-bold.text-xl.text-white').first();
      const name = nameEl.text().trim();
      if (!name) return;

      const unit = { name, modelOptions: [] };

      // Detect tiered pricing: count "YOUR X UNIT COSTS" headers
      const costHeaders = [];
      $(card).find('.bg-slate-200').each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes('YOUR')) costHeaders.push(text);
      });

      const isTiered = costHeaders.length > 1;

      // Collect model options grouped by tier
      const allOptions = [];
      $(card).find('ul.leaders').each((_, ul) => {
        const options = [];
        $(ul).find('li').each((_, li) => {
          const text = $(li).find('span').first().text().trim();
          const tplId = $(li).find('template').attr('id');
          const match = text.match(/(\d+)\s*model/);
          if (match) {
            options.push({
              count: parseInt(match[1], 10),
              cost: costMap[tplId] || 0,
            });
          }
        });
        allOptions.push(options);
      });

      if (isTiered && allOptions.length === 2) {
        // Tiered pricing: primary and secondary
        unit.modelOptions = allOptions[0];
        unit.tiered = {
          primary: allOptions[0],
          secondary: allOptions[1],
        };
      } else {
        // Flat pricing
        unit.modelOptions = allOptions.flat();
      }

      // Check for leader/support relationships
      const leaderDiv = $(card).find('.mx-3.font-bold');
      if (leaderDiv.length) {
        const leaderText = leaderDiv.text().trim();
        if (leaderText.includes('LEADER:')) {
          const leaderNames = leaderText
            .replace('LEADER:', '')
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);
          unit.leaderOf = leaderNames;
        } else if (leaderText.includes('SUPPORT:')) {
          const supportNames = leaderText
            .replace('SUPPORT:', '')
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);
          unit.supportFor = supportNames;
        }
      }

      units.push(unit);
    });

  const output = { detachments, units };
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
