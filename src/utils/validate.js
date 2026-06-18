// Check if a unit can be added given current army composition
export function canAddUnit(unitName, currentUnits, data) {
  const unitData = data.units.find((u) => u.name === unitName);
  if (!unitData) return { ok: true };

  const targets = [
    ...(unitData.leaderOf || []),
    ...(unitData.supportFor || []),
  ];

  if (targets.length === 0) return { ok: true };

  const hasTarget = currentUnits.some((u) =>
    targets.includes(u.unitName)
  );

  if (!hasTarget) {
    const type = unitData.leaderOf ? 'leader' : 'support';
    return {
      ok: false,
      reason: `Requires one of: ${targets.join(', ')}`,
      type,
    };
  }

  return { ok: true };
}

// Validate entire army, return array of issues
export function validateArmy(army, data) {
  const issues = [];

  for (const unit of army.units) {
    const unitData = data.units.find((u) => u.name === unit.unitName);
    if (!unitData) continue;

    const targets = [
      ...(unitData.leaderOf || []),
      ...(unitData.supportFor || []),
    ];

    if (targets.length === 0) continue;

    const hasTarget = army.units.some(
      (u) => u.id !== unit.id && targets.includes(u.unitName)
    );

    if (!hasTarget) {
      const type = unitData.leaderOf ? 'leader' : 'support';
      issues.push({
        unitId: unit.id,
        unitName: unit.unitName,
        type,
        reason: `No valid target in army. Requires: ${targets.join(', ')}`,
      });
    }
  }

  return issues;
}
