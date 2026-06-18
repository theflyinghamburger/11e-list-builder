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

- [ ] 2.1 Create `src/components/DetachmentSelector.jsx` — pick detachment, toggle enhancements, show DP cost
- [ ] 2.2 Handle tiered pricing in useArmy: derive tier from same-named unit count, apply 1st-2nd vs 3rd+ costs
- [ ] 2.3 Handle wargear costs: per-model add-ons (Twin cognis lascannon, Ferrumite cannon)
- [ ] 2.4 Add detachment info to ArmyList display

## Phase 3: Validation + Print + Polish

- [ ] 3.1 Create `src/utils/validate.js` — leader/support target validation, point cap warnings
- [ ] 3.2 Add `@media print` CSS for clean army list output via `window.print()`
- [ ] 3.3 Visual polish: over-budget red highlighting, faction branding, responsive layout
