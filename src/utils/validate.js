import { getDpBudget } from '../utils/dpBudget';

function getTargets(unitData) {
  return [...(unitData.leaderOf || []), ...(unitData.supportFor || [])];
}

export function canAddUnit(unitName, currentUnits, data) {
  const unitData = data.units.find((u) => u.name === unitName);
  if (!unitData) return { ok: true };

  const targets = getTargets(unitData);
  if (targets.length === 0) return { ok: true };

  const hasTarget = currentUnits.some((u) => targets.includes(u.unitName));

  if (!hasTarget) {
    return {
      ok: false,
      reason: `Requires one of: ${targets.join(', ')}`,
      type: unitData.leaderOf ? 'leader' : 'support',
    };
  }

  return { ok: true };
}

export function validateArmy(army, data) {
  const issues = [];

  const dpSpent = (army.detachments || []).reduce((s, d) => {
    const det = data.detachments.find((x) => x.name === d.name);
    return s + (det?.dpCost || 0);
  }, 0);
  const dpBudget = getDpBudget(army.pointLimit);
  if (dpSpent > dpBudget) {
    issues.push({ unitId: 'dp-budget', unitName: 'Detachments', type: 'dp', reason: `DP budget exceeded: ${dpSpent}/${dpBudget}` });
  }

  for (const unit of army.units) {
    const unitData = data.units.find((u) => u.name === unit.unitName);
    if (!unitData) continue;

    const targets = getTargets(unitData);
    if (targets.length === 0) continue;

    const hasTarget = army.units.some(
      (u) => u.id !== unit.id && targets.includes(u.unitName)
    );

    if (!hasTarget) {
      issues.push({
        unitId: unit.id,
        unitName: unit.unitName,
        type: unitData.leaderOf ? 'leader' : 'support',
        reason: `No valid target in army. Requires: ${targets.join(', ')}`,
      });
    }
  }

  return issues;
}
