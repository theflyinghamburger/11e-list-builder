# TODO

## Done
- Wahapedia rules & stratagems (2026-08-23): scraper (scripts/fetch-wahapedia-rules.js), 23
  folder chunks (src/data/rules/) with army rules, detachment rules, stratagems, enhancement
  text, errata; lazy getRules loader; DetachmentSelector shows army-rules panel, per-detachment
  rules & stratagems, Wahapedia-sourced enhancement tooltips. Coverage enforced by validate-data.js.
- Wahapedia datasheets (2026-08-23): scraper (scripts/fetch-wahapedia.js), 23 folder chunks
  covering all 1439 MFM units (src/data/datasheets/), lazy loader + DatasheetModal with info
  buttons in unit browser and army list. Coverage enforced by validate-data.js.
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
- Rules data comes from Wahapedia (only source with per-detachment stratagems + rule text);
  Crusade Rules and Boarding Actions are out of scope by design.
- MFM↔Wahapedia name drift (e.g. "The Ephemeral Tome", "(Aura)") resolved with bidirectional
  normalized-substring matching in both validator and UI. Three Wahapedia typos left as-is
  (tooltip only): orks "Gitfinder Googlez", votann "Dêlvwerke Navigator",
  astra-militarum "Sharp eyes, Light fingers".
- rules file keyed by MFM detachment name where the two sources disagree (DET_OVERRIDES in
  the scraper; genestealer-cults "Brood Brothers Auxilia").
