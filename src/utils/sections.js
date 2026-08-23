// Unit type → section. Order is priority: a unit appears in the first section it matches.
export const SECTIONS = [
  { title: 'EPIC HERO', types: ['EPIC HERO'] },
  { title: 'CHARACTERS', types: ['CHARACTER'] },
  { title: 'INFANTRY', types: ['INFANTRY'] },
  { title: 'VEHICLES', types: ['VEHICLE', 'AIRCRAFT'] },
  { title: 'MOUNTED', types: ['MOUNTED'] },
];

export const OTHER_SECTION = 'OTHER';

// ponytail: Wahapedia encodes per-model keywords as "NAME: TYPE" (e.g. "…ONLY: CHARACTER")
export function unitTypes(dsEntry) {
  const types = new Set();
  for (const k of dsEntry?.keywords || []) {
    const t = (k.includes(':') ? k.slice(k.lastIndexOf(':') + 1) : k).trim().toUpperCase();
    if (t) types.add(t);
  }
  return types;
}

// Groups units into the 5 sections + OTHER. Sections end up in priority order;
// callers drop empty groups (e.g. while searching).
export function groupUnits(unitList, datasheets) {
  const groups = SECTIONS.map((s) => ({ ...s, units: [] }));
  const other = { title: OTHER_SECTION, units: [] };
  for (const u of unitList) {
    const types = unitTypes(datasheets?.[u.name.toUpperCase()]);
    const target = groups.find((s) => s.types.some((t) => types.has(t))) || other;
    target.units.push(u);
  }
  return [...groups, other];
}
