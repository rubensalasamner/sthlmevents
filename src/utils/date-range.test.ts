import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { stockholmMidnight, windowFor } from './date-range.js';

// Dates chosen at DST edges and late-evening instants to prove windows are
// anchored to Stockholm's calendar, not the test machine's timezone.
const march = (day: number, hourUtc: string) => new Date(`2027-03-${day}T${hourUtc}:00:00Z`); // DST starts 2027-03-28
const october = (day: number, hourUtc: string) => new Date(`2027-10-${day}T${hourUtc}:00:00Z`); // DST ends 2027-10-31

describe('stockholmMidnight', () => {
  test('summer midnight is 22:00Z the day before (CEST, +02:00)', () => {
    assert.equal(stockholmMidnight(0, new Date('2026-07-15T12:00:00Z')).toISOString(), '2026-07-14T22:00:00.000Z');
  });

  test('winter midnight is 23:00Z the day before (CET, +01:00)', () => {
    assert.equal(stockholmMidnight(0, new Date('2026-01-15T12:00:00Z')).toISOString(), '2026-01-14T23:00:00.000Z');
  });

  test('spring-forward day is 23h (2027-03-28 starts +02:00)', () => {
    const from = stockholmMidnight(0, march(28, '12'));
    const to = stockholmMidnight(1, march(28, '12'));
    assert.equal(from.toISOString(), '2027-03-27T23:00:00.000Z');
    assert.equal(to.toISOString(), '2027-03-28T22:00:00.000Z');
  });

  test('autumn-back day is 25h (2027-10-31 ends +02:00)', () => {
    const from = stockholmMidnight(0, october(31, '12'));
    const to = stockholmMidnight(1, october(31, '12'));
    assert.equal(from.toISOString(), '2027-10-30T22:00:00.000Z');
    assert.equal(to.toISOString(), '2027-10-31T23:00:00.000Z');
  });
});

describe('windowFor', () => {
  test('today ends at next Stockholm midnight across timezones', () => {
    // 23:30Z is already 01:30 on Sep 5 in Stockholm — window is Sep 5 local.
    const w = windowFor('today', new Date('2026-09-04T23:30:00Z'))!;
    assert.equal(w.from.toISOString(), '2026-09-04T22:00:00.000Z');
    assert.equal(w.to.toISOString(), '2026-09-05T22:00:00.000Z');
  });

  test('weekend starts Saturday 00:00 Stockholm time', () => {
    // 2026-09-04 is a Friday (Stockholm).
    const w = windowFor('weekend', new Date('2026-09-04T10:00:00Z'))!;
    assert.equal(w.from.toISOString(), '2026-09-04T22:00:00.000Z');
    assert.equal(w.to.toISOString(), '2026-09-06T22:00:00.000Z');
  });

  test('weekend on a Sunday includes the weekend in progress', () => {
    // 2026-09-06 is a Sunday: Saturday was yesterday.
    const w = windowFor('weekend', new Date('2026-09-06T10:00:00Z'))!;
    assert.equal(w.from.toISOString(), '2026-09-04T22:00:00.000Z');
  });

  test('all returns null', () => {
    assert.equal(windowFor('all', new Date()), null);
  });
});
