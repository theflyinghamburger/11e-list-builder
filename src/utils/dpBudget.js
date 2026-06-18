export function getDpBudget(pointLimit) {
  if (pointLimit >= 3000) return 4;
  if (pointLimit >= 2000) return 3;
  return 2;
}
