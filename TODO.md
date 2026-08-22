# TODO

## Done
- 29 factions scraped from MFM (scripts/fetch-mfm.js), prices current at 2026-08-22 re-scrape
- Detachments, DP budget, enhancements, leader/support validation
- Per-instance tiered pricing (tiered.split recorded at scrape time)
- Army save/load as JSON file, autosave to localStorage
- Data validation gate (scripts/validate-data.js), mobile layout, print stylesheet

## Next
- [ ] CI job running node scripts/validate-data.js (optional; no CI set up yet)
- [ ] Custom factions UI (would need addFaction in src/data/index.js)
- [ ] Imperial Agents: imperial-agents.json has every unit twice with conflicting
      costs (MFM page duplication). Left as-is deliberately — resolve against the
      codex only if someone actually plays the faction.

## Decisions
- imperial-agents.json is excluded from re-scrapes (duplicate data, faction unused).
- Detachment names stay UPPERCASE (changing casing orphans saved army files).
