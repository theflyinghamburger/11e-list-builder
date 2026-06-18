// ponytail: shared tiered+wargear cost logic — ArmyList and UnitList both need it
export function getUnitPoints(unitData, modelCount, allUnits, wargear) {
  let cost = unitData.modelOptions.find((o) => o.count === modelCount)?.cost || 0;

  if (unitData.tiered) {
    const sameCount = allUnits.filter((u) => u.unitName === unitData.name).length;
    const tierOptions = sameCount <= 2 ? unitData.tiered.primary : unitData.tiered.secondary;
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
