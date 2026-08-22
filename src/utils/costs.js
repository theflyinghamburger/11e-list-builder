// ponytail: shared tiered+wargear cost logic — ArmyList and UnitList both need it
export function getUnitPoints(unitData, modelCount, instanceOrdinal, wargear) {
  let cost = unitData.modelOptions.find((o) => o.count === modelCount)?.cost || 0;

  if (unitData.tiered) {
    const split = unitData.tiered.split ?? 2; // ponytail: no split = legacy scrape (IA), behaves as 1st-2nd/3rd+
    const tierOptions = instanceOrdinal <= split ? unitData.tiered.primary : unitData.tiered.secondary;
    cost = tierOptions.find((o) => o.count === modelCount)?.cost || cost;
  }

  if (wargear) {
    for (const [name, count] of Object.entries(wargear)) {
      const wg = unitData.wargearOptions?.find((w) => w.name === name);
      if (wg) cost += wg.costPerModel * count;
    }
  }

  return cost;
}
