import * as cheerio from 'cheerio';

const URL = process.argv[2];

if (!URL) {
  console.error('Usage: node scripts/fetch-mfm.js <mfm-url>');
  console.error('Example: node scripts/fetch-mfm.js https://mfm.warhammer-community.com/en/necrons');
  process.exit(1);
}

async function main() {
  const response = await fetch(URL);
  let html = await response.text();

  // Resolve $RS calls: move hidden S:X div content into P:X template placeholders
  // MFM uses $RS("S:X","P:Y") to inject structural HTML (ul.leaders, cost headers)
  // into empty <template> tags at runtime. We must do this before parsing.
  const rsMappings = html.match(/\$RS\("S:([^"]+)",\s*"P:([^"]+)"\)/g) || [];
  const rsMap = {};
  rsMappings.forEach(match => {
    const [, srcId, targetId] = match.match(/\$RS\("S:([^"]+)",\s*"P:([^"]+)"\)/);
    rsMap[targetId] = srcId;
  });

  // Use Cheerio to build cost map from hidden divs, then inject content into templates
  let $ = cheerio.load(html);

  // Build cost map: template ID (P:X) → cost in pts
  // MFM uses hidden divs with $RS() to map S:X → P:X
  const costMap = {};
  const modelTextMap = {};
  for (const [targetId, srcId] of Object.entries(rsMap)) {
    const srcDiv = $(`#S\\:${srcId}`);
    const text = srcDiv.find('span').text().trim();
    if (text.includes('pts')) {
      const pts = parseInt(text.replace('pts', '').trim(), 10);
      if (!isNaN(pts)) costMap[`P:${targetId}`] = pts;
    } else if (text.includes('model')) {
      const count = parseInt(text.replace('models', '').trim(), 10);
      if (!isNaN(count)) modelTextMap[`P:${targetId}`] = count;
    }
  }

  // Inject hidden div content into templates
  for (const [targetId, srcId] of Object.entries(rsMap)) {
    const srcDiv = $(`#S\\:${srcId}`);
    const tpl = $(`#P\\:${targetId}`);
    if (srcDiv.length && tpl.length) {
      tpl.replaceWith(srcDiv.contents());
    }
  }
  html = $.html();
  $ = cheerio.load(html);

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

  // ponytail: toTitleCase for scraped names — MFM outputs uppercase, app expects title case
  function toTitleCase(str) {
    return str
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace('W/', 'w/');
  }

  // Parse units - all cards with unit name headers on the page
  $('.flex.flex-col.space-y-1.m-1').each((_, card) => {
      const nameEl = $(card).find('.bg-slate-500.font-bold.text-xl.text-white').first();
      const name = toTitleCase(nameEl.text().trim());
      if (!name) return;

      const unit = { name, modelOptions: [] };

      // Detect tiered pricing: count "YOUR X UNIT COSTS" headers
      const costHeaders = [];
      $(card).find('.bg-slate-200').each((_, el) => {
        const text = $(el).text().trim();
        if (text.includes('YOUR')) costHeaders.push(text);
      });

      const isTiered = costHeaders.length > 1;

      // Collect model options grouped by tier (each ul.leaders under a cost header = one tier)
      const allOptions = [];
      $(card).find('ul.leaders').each((_, ul) => {
        // Skip wargear lists (parent has "WARGEAR" header)
        if ($(ul).closest('.space-y-1').find('.bg-slate-200').first().text().includes('WARGEAR')) return;

        const options = [];
        $(ul).find('li').each((_, li) => {
          const spans = $(li).find('span').map((_, s) => $(s).text().trim()).get();
          const templates = $(li).find('template').map((_, t) => $(t).attr('id')).get();
          const text = spans[0] || '';
          const match = text.match(/(\d+)\s*model/);

          // Extract cost from template or second span
          let cost = 0;
          if (templates[0]) {
            cost = costMap[templates[0]] || 0;
          } else if (spans[1] && spans[1].includes('pts')) {
            cost = parseInt(spans[1].replace('pts', '').trim(), 10) || 0;
          }

          if (match) {
            options.push({
              count: parseInt(match[1], 10),
              cost,
            });
          } else if (templates.length >= 2) {
            // No span (e.g. Corpuscarii 10-model): first tpl = model count text, second = cost
            const count = modelTextMap[templates[0]] || 0;
            const tplCost = costMap[templates[1]] || 0;
            if (count > 0 && tplCost > 0) {
              options.push({ count, cost: tplCost });
            }
          } else if (cost > 0) {
            // Composite model description (e.g. "1 Sword Brother, 4 Neophytes, 5 Initiates")
            // Sum all numbers in the description for total model count
            const nums = text.match(/\d+/g);
            if (nums) {
              const count = nums.reduce((sum, n) => sum + parseInt(n, 10), 0);
              options.push({ count, cost });
            }
          }
        });
        if (options.length > 0) allOptions.push(options);
      });

      if (isTiered && allOptions.length >= 2) {
        // Tiered pricing: primary and secondary
        unit.modelOptions = allOptions[0];
        unit.tiered = {
          primary: allOptions[0],
          secondary: allOptions.slice(1).flat(),
        };
      } else {
        // Flat pricing
        unit.modelOptions = allOptions.flat();
      }

      // Extract wargear options
      $(card).find('.bg-slate-200').each((_, el) => {
        const text = $(el).text().trim();
        if (!text.includes('WARGEAR')) return;
        const wargear = [];
        $(el).parent().find('ul.leaders li').each((_, li) => {
          const liText = $(li).find('span').first().text().trim();
          const tplId = $(li).find('template').attr('id');
          if (liText && tplId) {
            wargear.push({
              name: toTitleCase(liText.replace('per ', '')),
              costPerModel: costMap[tplId] || 0,
            });
          }
        });
        if (wargear.length > 0) unit.wargearOptions = wargear;
      });

      // Check for leader/support relationships (unit-level, ADT format)
      $(card).find('.bg-slate-200').each((_, el) => {
        const text = $(el).text().trim();
        if (text === 'LEADER' || text === 'SUPPORT') {
          const targets = $(el).parent().find('span.font-bold').text().trim();
          const names = targets.split(',').map(s => toTitleCase(s.trim())).filter(Boolean);
          if (text === 'LEADER') {
            unit.leaderOf = names;
          } else {
            unit.supportFor = names;
          }
        }
      });

      // Also check detachment-style leader/support (Necrons format: LEADER:NAME1, NAME2)
      const leaderDiv = $(card).find('.mx-3.font-bold');
      if (leaderDiv.length && !unit.leaderOf && !unit.supportFor) {
        const leaderText = leaderDiv.text().trim();
        if (leaderText.includes('LEADER:')) {
          unit.leaderOf = leaderText
            .replace('LEADER:', '')
            .split(',')
            .map(s => toTitleCase(s.trim()))
            .filter(Boolean);
        } else if (leaderText.includes('SUPPORT:')) {
          unit.supportFor = leaderText
            .replace('SUPPORT:', '')
            .split(',')
            .map(s => toTitleCase(s.trim()))
            .filter(Boolean);
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
