# TODO - 11e List Builder

## Phase 1: Foundation — Data + State + Unit List

- [ ] 1.1 Initialize Vite + React project (`npm create vite@latest . -- --template react`)
- [ ] 1.2 Create `src/data/adeptus-mechanicus.json` with all 10 detachments and 34 units
- [ ] 1.3 Create `src/hooks/useArmy.js` — useReducer with actions: SET_POINT_LIMIT, SET_DETACHMENT, ADD_UNIT, REMOVE_UNIT, UPDATE_UNIT
- [ ] 1.4 Create `src/components/ArmySetup.jsx` — point size buttons (1000/2000/3000)
- [ ] 1.5 Create `src/components/UnitList.jsx` — searchable unit list with inline add/config (model count, wargear), merged browse + manage
- [ ] 1.6 Create `src/components/ArmyList.jsx` — detachment info, unit table, running point total, over-budget warning, print button
- [ ] 1.7 Wire up App.jsx with layout: setup (top), unit list (left), army list (right)

## Phase 2: Detachments + Tiered Pricing + Wargear

- [x] 2.1 Create `src/components/DetachmentSelector.jsx` — pick detachment, toggle enhancements, show DP cost
- [x] 2.2 Handle tiered pricing in useArmy: derive tier from same-named unit count, apply 1st-2nd vs 3rd+ costs
- [x] 2.3 Handle wargear costs: per-model add-ons (Twin cognis lascannon, Ferrumite cannon)
- [x] 2.4 Add detachment info to ArmyList display

## Phase 2.5: Ponytail Cleanup

- [x] Delete `handleWargearChange` — unused since wargear slider uses inline `setAddForm`
- [x] Drop unused `modelCount` param from `calculateCost`
- [x] Inline `getEnhancementsTotal` — one caller, 4 lines
- [x] Remove `useCallback` wrappers in `useArmy.js` — `dispatch` is stable, bare arrows suffice
- [x] Deduplicate tiered-pricing logic — extracted to `src/utils/costs.js`
- [x] Drop redundant `label onClick` in enhancement toggles
- [x] Delete empty `validate.js` stub

## Phase 3: Validation + Print + Polish

- [x] 3.1 Create `src/utils/validate.js` — leader/support target validation, point cap warnings
- [x] 3.2 Add `@media print` CSS for clean army list output via `window.print()`
- [ ] 3.3 Visual polish: over-budget red highlighting, faction branding, responsive layout

## Phase 4: Multi-Faction Support

Goal: switch factions without code changes — only new JSON + one-line registration.

- [x] 4.1 Create `src/data/index.js` — faction loader (`getData`, `getFactionKeys`)
- [x] 4.2 Add `SET_FACTION` action to `useArmy.js` reducer; reset army state on faction switch
- [x] 4.3 Replace static `import data from '../data/adeptus-mechanicus.json'` in `DetachmentSelector.jsx` — accept `data` prop
- [x] 4.4 Replace static import in `UnitList.jsx` — accept `data` prop
- [x] 4.5 Replace static import in `ArmyList.jsx` — accept `data` prop
- [x] 4.6 Replace static import in `validate.js` — accept `data` parameter
- [x] 4.7 `App.jsx` — derive `data = getData(state.faction)`, pass as prop to children
- [x] 4.8 `ArmySetup.jsx` — faction selector dropdown from `getFactionKeys()`
- [ ] 4.9 Add second faction JSON (e.g. `imperium.json`) to verify flow
