import assert from 'node:assert';
import { getUnitPoints } from '../src/utils/costs.js';

const primary = [{ count: 5, cost: 115 }];
const secondary = [{ count: 5, cost: 130 }];
const mk = (split) => ({
  name: 'T',
  modelOptions: primary,
  tiered: { split, primary, secondary },
  wargearOptions: [{ name: 'Blade', costPerModel: 2 }],
});

assert.equal(getUnitPoints(mk(2), 5, 1, {}), 115);  // split 2: 1st primary
assert.equal(getUnitPoints(mk(2), 5, 2, {}), 115);  // split 2: 2nd primary
assert.equal(getUnitPoints(mk(2), 5, 3, {}), 130);  // split 2: 3rd secondary
assert.equal(getUnitPoints(mk(1), 5, 2, {}), 130);  // split 1: 2nd already secondary
assert.equal(getUnitPoints(mk(3), 5, 3, {}), 115);  // split 3: 3rd still primary
assert.equal(getUnitPoints(mk(2), 5, 2, { Blade: 3 }), 121); // 115 + 2*3 wargear
assert.equal(getUnitPoints({ name: 'L', modelOptions: primary, tiered: { primary, secondary } }, 5, 2, {}), 115); // legacy: no split -> 2
assert.equal(getUnitPoints({ name: 'F', modelOptions: [{ count: 3, cost: 45 }] }, 3, 1, {}), 45); // flat pricing untouched

console.log('costs: all checks passed');
