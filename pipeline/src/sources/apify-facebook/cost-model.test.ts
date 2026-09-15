import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { costPerMonth, ACTORS } from './cost-model.js';

describe('cost-model', () => {
  it('charges per start + per event', () => {
    const runsPerDay = 1;
    const eventsPerRun = 10;
    const c = costPerMonth(ACTORS.official, runsPerDay, eventsPerRun);
    // 30 runs * $0.001 + 300 events * $0.013
    assert.ok(Math.abs(c - (30 * 0.001 + 300 * 0.013)) < 1e-9);
  });

  it('zero cost for zero runs', () => {
    assert.equal(costPerMonth(ACTORS.official, 0, 10), 0);
  });

  it('all actors have finite positive prices', () => {
    for (const actor of Object.values(ACTORS)) {
      assert.ok(actor.perEvent > 0);
      assert.ok(actor.perStart >= 0);
    }
  });
});
