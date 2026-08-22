import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
let failed = false;

function summarize(list) {
  if (!list.length) return '';
  const uniq = [...new Set(list)];
  return uniq.slice(0, 5).join(' | ') + (uniq.length > 5 ? ` | …+${uniq.length - 5} more` : '');
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const errors = [];
  const warns = [];

  if (!data.units || data.units.length === 0) errors.push('no units');
  // ponytail: titan-legions/chaos-titan-legions pages have no detachments section — warn, don't fail
  if (!data.detachments || data.detachments.length === 0) warns.push('no detachments');

  const names = new Set((data.units || []).map((u) => u.name));
  for (const u of data.units || []) {
    if (!u.modelOptions || u.modelOptions.length === 0) errors.push(`${u.name}: empty modelOptions`);
    for (const o of u.modelOptions || []) {
      if (typeof o.cost !== 'number' || !isFinite(o.cost)) {
        errors.push(`${u.name}: bad cost in ${JSON.stringify(o)}`);
      } else if (o.cost === 0) {
        // ponytail: zero = stale scrape (e.g. chaos-knights War Dog Stalker); re-scrape fixes it
        warns.push(`${u.name}: zero cost`);
      }
    }
    if (u.tiered) {
      if (u.tiered.split === undefined) warns.push(`${u.name}: tiered missing split`);
      else if (![1, 2, 3].includes(u.tiered.split)) errors.push(`${u.name}: tiered.split ${u.tiered.split} not in 1,2,3`);
      const counts = (opts) => (opts || []).map((o) => o.count).sort((a, b) => a - b).join(',');
      if (counts(u.tiered.primary) !== counts(u.tiered.secondary)) {
        errors.push(`${u.name}: tiered count coverage differs (${counts(u.tiered.primary)} vs ${counts(u.tiered.secondary)})`);
      }
    }
    for (const r of [...(u.leaderOf || []), ...(u.supportFor || [])]) {
      if (!names.has(r)) warns.push(`${u.name}: dangling ref "${r}"`);
    }
  }
  const seen = new Set();
  for (const u of data.units || []) {
    if (seen.has(u.name)) warns.push(`dup unit: ${u.name}`);
    seen.add(u.name);
  }
  for (const d of data.detachments || []) {
    if (typeof d.dpCost !== 'number' || !isFinite(d.dpCost) || d.dpCost < 0) {
      errors.push(`detachment ${d.name}: bad dpCost ${JSON.stringify(d.dpCost)}`);
    }
  }

  const status = errors.length ? 'ERROR' : warns.length ? 'warn' : 'ok';
  console.log(`${file}: ${status}${errors.length || warns.length ? ' — ' + summarize([...errors, ...warns]) : ''}`);
  if (errors.length) failed = true;
}

process.exit(failed ? 1 : 0);
