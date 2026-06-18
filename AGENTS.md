# AGENTS.md

## Project

Warhammer 40k 11e army list builder for Adeptus Mechanicus. Vite + React, no TypeScript.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |

No lint, typecheck, or test commands configured.

## Structure

- `src/data/*.json` — codex data (detachments, units, costs). Source of truth for army rules.
- `src/hooks/useArmy.js` — central state via `useReducer`. All army mutations flow here.
- `src/components/` — UI components. `App.jsx` wires layout: setup (top), unit list (left), army list (right).
- `src/utils/validate.js` — army composition validation (leader/support rules).
- `TODO.md` — phased implementation plan. Check before adding features to avoid duplicating in-progress work.

## Adding a new faction

1. Create `src/data/<faction-key>.json` with `detachments` and `units` arrays. Use `adeptus-mechanicus.json` as a template.
2. In `src/data/index.js`, import the new file and add it to the `factions` object:
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
