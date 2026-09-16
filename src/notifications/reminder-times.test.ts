import assert from 'node:assert/strict';
import { test } from 'node:test';

import { reminderFireTimes, reminderNotificationId } from './reminder-times.js';

/** Fixed "now": Wednesday 2026-09-16 12:00 Stockholm (CEST = UTC+2 → 10:00Z). */
const NOW = new Date('2026-09-16T10:00:00.000Z');

test('reminderFireTimes: empty when event already started', () => {
  assert.deepEqual(reminderFireTimes('2026-09-16T08:00:00.000Z', NOW), []);
});

test('reminderFireTimes: empty when event starts within a minute', () => {
  assert.deepEqual(reminderFireTimes('2026-09-16T10:00:30.000Z', NOW), []);
});

test('reminderFireTimes: both day-before and hours-before for a far-away event', () => {
  // Event: Friday 2026-09-25 10:00 Stockholm = 08:00Z
  const fires = reminderFireTimes('2026-09-25T08:00:00.000Z', NOW);
  assert.equal(fires.length, 2);
  assert.equal(fires[0]!.kind, 'day-before');
  // Day before = Thu 24 Sep 09:00 Stockholm = 07:00Z
  assert.equal(fires[0]!.at.toISOString(), '2026-09-24T07:00:00.000Z');
  assert.equal(fires[1]!.kind, 'hours-before');
  // 2h before = 08:00Z - 2h = 06:00Z
  assert.equal(fires[1]!.at.toISOString(), '2026-09-25T06:00:00.000Z');
});

test('reminderFireTimes: only hours-before when day-before morning has passed', () => {
  // Event tomorrow 18:00 Stockholm = 16:00Z; day-before 09:00 was this morning (past)
  const fires = reminderFireTimes('2026-09-17T16:00:00.000Z', NOW);
  assert.equal(fires.length, 1);
  assert.equal(fires[0]!.kind, 'hours-before');
  assert.equal(fires[0]!.at.toISOString(), '2026-09-17T14:00:00.000Z');
});

test('reminderFireTimes: only day-before when hours-before has not arrived yet is still both', () => {
  // Covered by the far-away case; this asserts a same-week evening event keeps both.
  const fires = reminderFireTimes('2026-09-20T17:00:00.000Z', NOW); // Sat 19:00 Stockholm
  assert.equal(fires.map((f) => f.kind).join(','), 'day-before,hours-before');
});

test('reminderNotificationId: deterministic and kind-scoped', () => {
  assert.equal(
    reminderNotificationId('apify-facebook:123', 'day-before'),
    'fav-reminder:day-before:apify-facebook:123',
  );
  assert.notEqual(
    reminderNotificationId('x', 'day-before'),
    reminderNotificationId('x', 'hours-before'),
  );
});
