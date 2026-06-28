# AGENTS.md

## Project

Warhammer 40k 11e army list builder for Adeptus Mechanicus. Vite + React, no TypeScript.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run fetch-mfm <url>` | Scrape MFM faction page → JSON (requires Node 22) |

No lint, typecheck, or test commands configured.

## Structure

- `src/data/*.json` — codex data (detachments, units, costs). Source of truth for army rules.
- `src/hooks/useArmy.js` — central state via `useReducer`. All army mutations flow here.
- `src/components/` — UI components. `App.jsx` wires layout: setup (top), unit list (left), army list (right).
- `src/utils/validate.js` — army composition validation (leader/support rules).
- `scripts/fetch-mfm.js` — MFM scraper (Cheerio + native fetch). Extracts detachments, units, costs, tiered pricing, leader/support.
- `TODO.md` — phased implementation plan. Check before adding features to avoid duplicating in-progress work.

## Adding a new faction

**Option A — MFM scraper (fastest):** Run `node scripts/fetch-mfm.js <mfm-url> > src/data/<key>.json` to generate the JSON from mfm.warhammer-community.com. Register the output in `src/data/index.js`.

**Important:** Use `node scripts/fetch-mfm.js`, not `npm run fetch-mfm`. The npm wrapper echoes the command to stdout, which corrupts the JSON output when redirected.

**Option B — Manual:** Create `src/data/<faction-key>.json` with `detachments` and `units` arrays. Use `adeptus-mechanicus.json` as a template. Then register in `src/data/index.js`:
   ```js
   import newFaction from './new-faction.json';
   const factions = { 'adeptus-mechanicus': admech, 'new-faction': newFaction };
   ```

**Data format:**

- `detachments`: `{ name, dpCost, doctrine, enhancements: [{ name, pts }] }`
- `units`: `{ name, modelOptions: [{ count, cost }] }` plus optional fields:
  - `tiered: { primary, secondary }` — arrays of `{ count, cost }` for 1st-2nd vs 3rd+ instance pricing
  - `wargearOptions: [{ name, costPerModel }]` — per-model add-ons
  - `leaderOf: [unitName, ...]` — unit must have one of these in the army
  - `supportFor: [unitName, ...]` — unit must have one of these in the army

No code changes needed beyond the data files — the UI is faction-agnostic.
