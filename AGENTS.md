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

## Conventions

- No TypeScript. No linting framework. No test framework.
- State is centralized in `useArmy` reducer; components read from it.
- Tiered pricing: 1st-2nd instances of a unit cost less than 3rd+. Wargear is per-model.
