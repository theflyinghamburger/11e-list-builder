# AGENTS.md

## Project

Warhammer 40k 11e army list builder. 29 factions. Vite + React, no TypeScript.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `node scripts/fetch-mfm.js <url>` | Scrape MFM faction page → JSON (requires Node 22) |
| `node scripts/validate-data.js` | Validate `src/data/*.json` (exit 1 on errors) |
| `node scripts/test-costs.js` | Tiered pricing self-check (assert-based) |

No lint, typecheck, or test framework configured.

## Structure

- `src/data/*.json` — codex data (detachments, units, costs). Source of truth for army rules.
- `src/data/index.js` — faction registry: `getData(key)`, `getFactionKeys()`. Hydrates custom factions from localStorage (`custom-factions`).
- `src/hooks/useArmy.js` — central state via `useReducer`. All army mutations flow here.
- `src/components/` — UI components. `App.jsx` wires layout: setup (top), unit list (left), army list (right).
- `src/utils/validate.js` — army composition validation (leader/support rules).
- `src/utils/costs.js` — point cost calculation (flat, tiered, wargear).
- `src/utils/dpBudget.js` — DP budget by point limit (1000→2, 2000→3, 3000→4).
- `scripts/fetch-mfm.js` — MFM scraper (Cheerio + native fetch). Extracts detachments, units, costs, tiered pricing, leader/support.
- `TODO.md` — phased implementation plan. Check before adding features to avoid duplicating in-progress work.

## Adding a new faction

**Option A — MFM scraper (fastest):** Run `node scripts/fetch-mfm.js <mfm-url> > src/data/<key>.json` to generate the JSON from mfm.warhammer-community.com. Register the output in `src/data/index.js`.

**Important:** Use `node scripts/fetch-mfm.js`, not `npm run fetch-mfm`. The npm wrapper echoes the command to stdout, which corrupts the JSON output when redirected.

**Note:** `src/data/imperial-agents.json` is intentionally excluded from re-scrapes — the MFM page duplicates every unit card with conflicting costs and the faction is unused in practice. Leave the committed file byte-identical.

**Option B — Manual:** Create `src/data/<faction-key>.json` with `detachments` and `units` arrays. Use `adeptus-mechanicus.json` as a template. Then register in `src/data/index.js`:
   ```js
   import newFaction from './new-faction.json';
    const factions = { 'adeptus-mechanicus': admech, 'new-faction': newFaction };
    ```

**Data format:**

- `detachments`: `{ name, dpCost, doctrine, enhancements: [{ name, pts }] }`
- `units`: `{ name, modelOptions: [{ count, cost }] }` plus optional fields:
  - `tiered: { split, primary, secondary }` — `split` = number of instances priced at primary (1/2/3, default 2 when absent); `primary`/`secondary` are arrays of `{ count, cost }`
  - `wargearOptions: [{ name, costPerModel }]` — per-model add-ons
  - `leaderOf: [unitName, ...]` — unit must have one of these in the army
  - `supportFor: [unitName, ...]` — unit must have one of these in the army

No code changes needed beyond the data files — the UI is faction-agnostic.
