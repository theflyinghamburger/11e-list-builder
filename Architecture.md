# Warhammer 40k 11e List Builder - Architecture

## Overview

A web app for building Warhammer 40k 11th edition army lists. Starts with Adeptus Mechanicus only, extensible to other factions.

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
│   │   ├── index.js               // Faction loader: getData(key), getFactionKeys()
│   │   ├── adeptus-mechanicus.json
│   │   └── [faction].json         // Additional factions (same schema)
│   ├── components/
│   │   ├── ArmySetup.jsx          // Faction selector + point size + load list
│   │   ├── DetachmentSelector.jsx // Pick detachment(s) + enhancements
│   │   ├── UnitList.jsx           // Browse + manage units (merged browser + config)
│   │   └── ArmyList.jsx           // Built army display + totals + save + print
│   ├── hooks/
│   │   └── useArmy.js
│   └── utils/
│       ├── costs.js               // Generic cost calculation (faction-agnostic)
│       ├── dpBudget.js            // DP budget by point limit (Phase 6)
│       ├── storage.js             // localStorage save/load (Phase 5)
│       └── validate.js            // Leader/support validation (data-driven)
│   └── scripts/
│       └── fetch-mfm.js           // MFM scraper (Cheerio + native fetch)
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
  detachment: { name, enhancements: [] },
  units: [
    {
      id,           // unique per army slot (same unit can appear multiple times)
      unitName,     // references data
      modelCount,
      wargear: {},  // { "Twin cognis lascannon": 2 }
      // tierIndex is derived: count how many of same unitName exist, compute at render time
    }
  ]
}
```

## Point Cost Data (Extracted from MFM)

### Detachments (10)

| Name | DP | Doctrine | Enhancements |
|------|----|----------|-------------|
| Cohort Acquisitus | 1 | Reconnaissance | Explorator Dispensation (20), Stealth-screened Cybercanids (15) |
| Cohort Cybernetica | 2 | Take and Hold | Arch-negator (5), Emotionless Clarity (10), Lord of Machines (15), Necromechanic (20) |
| Data-Psalm Conclave | 2 | Disruption | Data-blessed Autosermon (15), Mantle of the Gnosticarch (10), Mechanicus Locum (5), Temporcopia (20) |
| Eradication Cohort | 3 | Purge the Foe | Belicosa-class Capacitor Vanes (25), Martial Signatum Amplificator (15), Omnicogitator (25), Omnissiah's Fury (10) |
| Explorator Maniple | 2 | Priority Assets | Artisan (10), Genetor (20), Logis (15), Magos (10) |
| Haloscreed Battle Clade | 3 | Purge the Foe | Cognitive Reinforcement (30), Inloaded Lethality (15), Sanctified Ordnance (10), Transoracular Dyad Wafers (15) |
| Lords of the Forge | 1 | Priority Assets | TL-4ø9 (30), Vingh's Wafers of Dynamism (25) |
| Luminen Auto-Choir | 1 | Disruption | Electromiasmic Brazier (10), Voltagheist Reliquary (15) |
| Rad-Zone Corps | 2 | Take and Hold | Autoclavic Denunciation (15), Malphonic Susurrus (20), Peerless Eradicator (20), Radial Suffusion (25) |
| Skitarii Hunter Cohort | 2 | Reconnaissance | Battle-sphere Uplink (25), Cantic Thrallnet (25), Clandestine Infiltrator (15), Veiled Hunter (10) |

### Units (34)

| Unit | Models | Cost(s) | Notes |
|------|--------|---------|-------|
| Archaeopter Fusilave | 1 | 160 | |
| Archaeopter Stratoraptor | 1 | 185 | |
| Archaeopter Transvector | 1 | 145 | |
| Belisarius Cawl | 1 | 220 | |
| Corpuscarii Electro-Priests | 5, 10 | 65, 130 | |
| Cybernetica Datasmit | 1 | 25 | Support: Kastelan Robots |
| Fulgure Electro-Priests | 5, 10 | 70, 140 | |
| Hastarii Exterminators | 5 | 115 (1st-2nd), 130 (3rd+) | Tiered |
| Hastarii Fusiliers | 5 | 115 (1st-2nd), 130 (3rd+) | Tiered |
| Ironstrider Ballistarii | 1, 2, 3 | 80/160/240 (1st-2nd), 95/175/255 (3rd+) | Tiered, wargear: Twin cognis lascannon |
| Kastelan Robots | 2, 4 | 160/320 (1st), 180/340 (2nd+) | Tiered |
| Kataphron Breachers | 3, 6 | 150, 320 | |
| Kataphron Destroyers | 3, 6 | 100, 210 | |
| Onager Dunecrawler | 1 | 155 | |
| Pteraxii Skystalkers | 5, 10 | 80/150 (1st-2nd), 90/160 (3rd+) | Tiered |
| Pteraxii Sterylizors | 5, 10 | 80/160 (1st-2nd), 90/170 (3rd+) | Tiered |
| Serberys Raiders | 3, 6 | 60, 120 | |
| Serberys Sulphurhounds | 3, 6 | 55, 110 | |
| Servitor Battleclade | 9 | 65 | |
| Sicarian Infiltrators | 5, 10 | 75/155 (1st-2nd), 85/165 (3rd+) | Tiered |
| Sicarian Ruststalkers | 5, 10 | 75/160 (1st-2nd), 85/170 (3rd+) | Tiered |
| Skitarii Marshal | 1 | 35 | Support: Hastarii Exterminators, Hastarii Fusiliers, Skitarii Rangers, Skitarii Vanguard |
| Skitarii Rangers | 10 | 85 | |
| Skitarii Vanguard | 10 | 90 | |
| Skorpius Disintegrator | 1 | 160 | Wargear: Ferrumite cannon (10 pts) |
| Skorpius Dunerider | 1 | 85 | |
| Sydonian Dragoons w/ Radium Jezails | 1, 2, 3 | 55, 100, 150 | |
| Sydonian Dragoons w/ Taser Lances | 1, 2, 3 | 60, 120, 170 | |
| Sydonian Skatros | 1 | 50 | |
| Technoarchaeologist | 1 | 45 | Leader: Corpuscarii, Fulgurite, Hastarii, Kataphron, Servitor, Skitarii |
| Tech-Priest Dominus | 1 | 65 | Leader: Corpuscarii, Fulgurite, Hastarii, Kataphron, Servitor, Skitarii |
| Tech-Priest Enginseer | 1 | 55 | Leader: Corpuscarii, Fulgurite, Kataphron, Skitarii |
| Tech-Priest Manipulus | 1 | 60 | Leader: Corpuscarii, Fulgurite, Hastarii, Kataphron, Servitor, Skitarii |
| Thulia Ghuld | 1 | 180 | |

### Leader/Support Relationships

**Leaders** (attach to unit, not separate):
- Tech-Priest Dominus → Corpuscarii, Fulgurite, Hastarii Exterminators/Fusiliers, Kataphron Breachers/Destroyers, Servitor Battleclade, Skitarii Rangers/Vanguard
- Tech-Priest Enginseer → Corpuscarii, Fulgurite, Kataphron Breachers/Destroyers, Skitarii Rangers/Vanguard
- Tech-Priest Manipulus → Corpuscarii, Fulgurite, Hastarii Exterminators/Fusiliers, Kataphron Breachers/Destroyers, Servitor Battleclade, Skitarii Rangers/Vanguard
- Technoarchaeologist → Corpuscarii, Fulgurite, Hastarii Exterminators/Fusiliers, Kataphron Breachers/Destroyers, Servitor Battleclade, Skitarii Rangers/Vanguard

**Support** (separate unit, must have valid target in army):
- Skitarii Marshal → Hastarii Exterminators, Hastarii Fusiliers, Skitarii Rangers, Skitarii Vanguard
- Technoarchaeologist → Corpuscarii, Fulgurite, Hastarii, Kataphron, Servitor, Skitarii
- Cybernetica Datasmit → Kastelan Robots

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

**Option A — MFM scraper (fastest):** Run `npm run fetch-mfm <mfm-url>` to generate the JSON from mfm.warhammer-community.com. Register the output in `src/data/index.js`.

**Option B — Manual:** Create `src/data/[faction-slug].json` using the existing schema (detachments + units arrays). Register in `src/data/index.js` — one import + one key. No other code changes required.

### MFM Scraper (`scripts/fetch-mfm.js`)

Scrapes MFM faction pages to generate JSON data files. Requires Node 22 (native `fetch` + Cheerio compatibility).

**Usage:** `npm run fetch-mfm https://mfm.warhammer-community.com/en/necrons`

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

## Save/Load (Phase 5)

localStorage-based persistence. No backend, no IndexedDB — army state is small (<50KB).

### Storage (`src/utils/storage.js`)

All armies stored under a single localStorage key `army-lists`:

```js
{
  "My AdMech Army": {
    timestamp: 1718700000000,
    name: "My AdMech Army",
    state: { faction, pointLimit, detachments, units }
  }
}
```

Functions: `saveArmy(name, state)`, `loadArmy(name)`, `listArmies()`, `deleteArmy(name)`.

### UI

- **Save** — button in `ArmyList` header. `prompt()` for name, overwrites if exists.
- **Load** — button in `ArmySetup`. Opens dropdown of saved lists (name + date). Select replaces state via `LOAD_ARMY`.
- **Delete** — (x) button per entry in load dropdown.

### Migration

Phase 5 saves use `detachment` (single). Phase 6 load wraps single detachment in array for backward compatibility.

## Multi-Detachment (Phase 6)

Multiple detachments allowed within a DP budget tied to point limit.

### DP Budget

| Point Limit | Max DP |
|-------------|--------|
| 1000 | 2 |
| 2000 | 3 |
| 3000 | 4 |

Budget recalculated on `SET_POINT_LIMIT`. If new budget < current DP spent, warn but do not auto-remove.

### State Shape

```js
// Before (single):
{ detachment: { name: "Cohort Acquisitus", enhancements: ["Explorator Dispensation"] } }

// After (array):
{
  detachments: [
    { name: "Cohort Acquisitus", enhancements: ["Explorator Dispensation"] },
    { name: "Luminen Auto-Choir", enhancements: [] }
  ]
}
```

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
