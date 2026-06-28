# Warhammer 40k 11e List Builder - Architecture

## Overview

A web app for building Warhammer 40k 11th edition army lists. 29 factions supported, faction-agnostic core.

Point costs sourced from the Munitorum Field Manual (mfm.warhammer-community.com). UI inspired by New Recruit (newrecruit.eu).

## Tech Stack

- **React + Vite** — build tooling, JSX
- **window.print() + @media print CSS** — PDF export (no deps)
- **useReducer** — army state management (no Redux/Zustand)
- No router, no backend, no database

## Project Structure

```
11e-list-builder/
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── data/
│   │   ├── index.js               // Faction loader: getData(key), getFactionKeys(), addFaction(key, data)
│   │   ├── adeptus-mechanicus.json
│   │   └── [faction].json         // 29 factions total (same schema)
│   ├── components/
│   │   ├── ArmySetup.jsx          // Faction selector + point size + load list
│   │   ├── DetachmentSelector.jsx // Pick detachment(s) + enhancements
│   │   ├── UnitList.jsx           // Browse + manage units (merged browser + config)
│   │   └── ArmyList.jsx           // Built army display + totals + save + print
│   ├── hooks/
│   │   └── useArmy.js
│   ├── utils/
│   │   ├── costs.js               // Generic cost calculation (faction-agnostic)
│   │   ├── dpBudget.js            // DP budget by point limit (Phase 6)
│   │   └── validate.js            // Leader/support validation (data-driven)
│   └── App.css                    // AdMech terminal theme, print, responsive
│
├── scripts/
│   └── fetch-mfm.js               // MFM scraper (Cheerio + native fetch)
```

## Data Model

### Faction Data (`data/[faction].json`)

One JSON file per faction, registered in `data/index.js`. Each contains:

**detachments** — array of:
- `name`, `dpCost`, `doctrine`, `enhancements[]` (name + pts)

**units** — array of:
- `name`
- `modelOptions[]` — `{ count, cost }` pairs
- `tieredPricing` — optional, `{ firstN: { modelOptions[] }, rest: { modelOptions[] } }` for units like HASTARII EXTERMINATORS (different cost for 1st-2nd vs 3rd+)
- `wargearOptions[]` — `{ name, costPerModel }` for units like IRONSTRIDER BALLISTARII
- `leaderOf[]` — unit names this unit can lead (empty or absent = not a leader)
- `supportFor[]` — unit names this unit can support (empty or absent = not a support)

### Army State (useReducer)

```js
{
  faction: "adeptus-mechanicus",
  pointLimit: 2000,
  name: "",                    // army name (editable)
  detachments: [               // array (Phase 6: multi-detachment)
    { name: "Cohort Acquisitus", enhancements: ["Explorator Dispensation"] },
    { name: "Luminen Auto-Choir", enhancements: [] }
  ],
  units: [
    {
      id,           // unique per army slot (same unit can appear multiple times)
      unitName,     // references data
      modelCount,
      wargear: {},  // { "Twin cognis lascannon": 2 }
      // tierIndex is derived: count how many of same unitName exist, compute at render time
    }
  ],
  _data: null,   // faction data set by App.jsx (for DP cost lookups)
}
```

### Reducer Actions

| Action | Purpose |
|--------|---------|
| `SET_POINT_LIMIT` | Change point limit, warns if DP budget exceeded |
| `SET_FACTION` | Switch faction, resets all state |
| `ADD_DETACHMENT` | Add to array, rejects if DP over budget |
| `REMOVE_DETACHMENT` | Remove by name |
| `UPDATE_DETACHMENT_ENHANCEMENTS` | Toggle enhancements for a specific detachment |
| `ADD_UNIT` | Add unit to army |
| `REMOVE_UNIT` | Remove unit by id |
| `LOAD_ARMY` | Replace state, migrates legacy single `detachment` to `detachments[]` |
| `SET_NAME` | Set army name |
| `SET_DATA` | Set faction data (used by App.jsx useEffect) |
```

## Point Cost Data

Sourced from the Munitorum Field Manual (mfm.warhammer-community.com). Per-faction data lives in `src/data/*.json`. See `adeptus-mechanicus.json` as a reference for the schema.

## Validation Rules

1. Total points ≤ selected point limit (1000 / 2000 / 3000)
2. Detachment DP cost tracked (informational)
3. Leaders can only be added if their valid target unit exists in the army
4. Support units can only be added if their valid target unit exists
5. Model counts constrained to defined options
6. Tiered pricing: count same-named units in army to derive which tier a new unit falls into

## PDF Export

`window.print()` with `@media print` CSS. No external dependency. The army list renders as a clean table in print layout.

## Multi-Faction Architecture

The core logic is faction-agnostic. All faction-specific behavior comes from data files.

### Data Loader (`src/data/index.js`)

Registry pattern — register new factions by adding an import + key:

```js
import admech from './adeptus-mechanicus.json';
const factions = { 'adeptus-mechanicus': admech };
export function getData(key) { return factions[key]; }
export function getFactionKeys() { return Object.keys(factions); }
```

### Data Flow

1. `useArmy` reducer holds `state.faction` (key string) and exposes `SET_FACTION`
2. `App.jsx` derives `data = getData(state.faction)` and passes it as a prop to `DetachmentSelector`, `UnitList`, `ArmyList`
3. `validate.js` receives `data` as a parameter instead of importing statically
4. Switching factions resets the army state (detachment, units) to avoid cross-faction data corruption

### Adding a New Faction

**Option A — MFM scraper (fastest):** Run `node scripts/fetch-mfm.js <mfm-url> > src/data/<key>.json` to generate the JSON from mfm.warhammer-community.com. Register the output in `src/data/index.js`.

**Important:** Use `node scripts/fetch-mfm.js`, not `npm run fetch-mfm`. The npm wrapper echoes the command to stdout, which corrupts the JSON output when redirected.

**Option C — Runtime (no code changes):** Call `addFaction(key, data)` from `src/data/index.js`. Validates format, registers in-memory, persists to localStorage under `custom-factions`. No UI caller yet — intended for future "add custom faction" feature.

**Option B — Manual:** Create `src/data/[faction-slug].json` using the existing schema (detachments + units arrays). Register in `src/data/index.js` — one import + one key. No other code changes required.

### MFM Scraper (`scripts/fetch-mfm.js`)

Scrapes MFM faction pages to generate JSON data files. Requires Node 22 (native `fetch` + Cheerio compatibility).

**Usage:** `node scripts/fetch-mfm.js https://mfm.warhammer-community.com/en/necrons > src/data/necrons.json`

**What it extracts:**
- **Detachments:** name, DP cost, doctrine, enhancements (name + pts), leader/support targets
- **Units:** name, model options (count + cost), tiered pricing (`primary`/`secondary`), leader/support targets
- **Point costs:** extracted from hidden `<div>` elements mapped via `$RS()` template IDs

**Tiered pricing:** detects "YOUR 1ST/2ND+" headers → outputs `tiered: { primary, secondary }` on unit objects.

**Leader/support:** extracted from detachment cards (e.g. CURSED LEGION → `leaderOf: ["LOKHUST DESTROYERS", ...]`).

**Limitations:**
- Wargear options not extracted — MFM only documents wargear in instructions, not per-unit data
- Some faction pages return 500 errors (e.g. Adeptus Telepathica, Idoneth Wyrmkin)

### Already Generic (No Changes Needed)

- `costs.js` — operates on unit objects, no faction awareness
- `useArmy.js` reducer — manages generic unit/detachment state
- `validate.js` — validates leader/support rules against whatever `data.units` is passed
- `ArmySetup.jsx` — point limit selector, no faction awareness
- `App.jsx` layout — no faction awareness

## Save/Load

File-based persistence (JSON download/upload). No localStorage, no backend.

### Save

- Button in `ArmyList` header. Creates a JSON Blob from army state, triggers browser download.
- Filename uses army name (or "army-list.json" if unnamed).

### Load

- Button in `ArmyList` header. Opens `<input type="file">` file picker.
- Parsed JSON dispatched via `LOAD_ARMY`. Migrates legacy single `detachment` to `detachments[]` array.

### Custom Factions (localStorage)

Only custom factions added via `addFaction()` are persisted to localStorage under `custom-factions`. Army lists themselves are not.

## Multi-Detachment (Phase 6)

Multiple detachments allowed within a DP budget tied to point limit.

### DP Budget

| Point Limit | Max DP |
|-------------|--------|
| 1000 | 2 |
| 2000 | 3 |
| 3000 | 4 |

Budget recalculated on `SET_POINT_LIMIT`. If new budget < current DP spent, warn but do not auto-remove.

### Actions

- `ADD_DETACHMENT` — add to array; reject if DP sum exceeds budget
- `REMOVE_DETACHMENT` — remove by name
- `UPDATE_DETACHMENT_ENHANCEMENTS` — toggle enhancements for a specific detachment (by name)

### DetachmentSelector Changes

- Show selected detachments as a list (name, DP, doctrine, enhancements toggle)
- Show remaining DP budget (e.g. "DP: 1/3")
- "Add Detachment" button opens browser (same card UI as before)
- Each selected detachment has a remove (x) button
- Clicking a detachment card while budget is full shows "DP limit reached"

## Deployment

`vite.config.js` sets `base: '/11e-list-builder/'` for GitHub Pages sub-path deployment.

## Notes

- `puppeteer` is listed in `devDependencies` but unused — the MFM scraper uses native `fetch` + Cheerio only.
- Google Fonts (Cinzel + Share Tech Mono) loaded in `index.html`.
- `src/App.css` — AdMech terminal theme, `@media print` styles, responsive layout (`max-width: 768px`).
