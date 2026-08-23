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
- Purpose-built print sheet (2026-08-23): PrintSheet.jsx replaces the old right-panel
  print CSS — page 1 army summary (detachments + doctrine + enhancements, units with
  wargear + tier markers, grand total), page 2+ army rules + per-detachment rules/
  stratagems/enhancements, then one datasheet page per unit instance. Verified via
  headless Chrome CDP matrix (scripts run ad hoc, not committed). Known quirk:
  titan-legions resolves to rules/adeptus-titanicus.json whose armyRules are polluted
  with core-rules text and a "Disable Ads" block — printed verbatim, re-scrape later.
- YellowScribe import/export (2026-08-23): src/utils/yellowscribe.js converts army
  state to 11e .ros/.rosz (fflate zip) and back (cheerio xmlMode parse), plus
  Phase 2 helpers for 8-hex TTS codes via a user-deployed relay (proxy/
  yellowscribe-worker.js, CORS relay to yellowscribe.link; PROXY constant in
  yellowscribe.js, code buttons hidden while empty). ArmyList: Export .rosz
  (New Recruit / YellowScribe) button, Load accepts .json/.ros/.rosz with
  unknown-wargear warnings. Round-trip self-check: node scripts/
   test-yellowscribe.js. Per plan .opencode/plans/yellowscribe-import-export.md;
   wargear statlines are not representable (see plan §8).
- .rosz import: force-level characters/vehicles, detachments, enhancements,
  point limit (2026-08-23): rosToArmy reads force-level `model` selections (NR
  characters/vehicles have no unit wrapper) as unit entries, parses Battle Size
  for pointLimit, maps `Enhancements::<det> Enhancements` upgrades onto
  detachments (resolved to data names, case/apostrophe-insensitive), and only
  reads `Wargear*`-grouped upgrades as wargear (weapon options/config excluded).
  armyToRos emits the Detachment config selection, groups exported wargear as
  `group="Wargear"`, and rides detachment enhancements on the first unit.
  normName() in costs.js makes wargear cost calc case/punctuation-insensitive
  (NR writes "Ferrumite cannon"). Self-checks: NR-shape fixture (605 pts) plus
  an optional live check of a real NR .rosz when present (16 entries, 1995/2000
  pts — matches New Recruit's own total). Per plan .opencode/plans/
  fix-rosz-import.md. Known data drift: NR's "Twin cognis autocannon" is not in
  adeptus-mechanicus.json wargearOptions (fires the unknown-wargear alert).

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
