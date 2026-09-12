import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import { filterByDateRange, splitByDateRange } from './date-range.js';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-05T09:00:00.000Z',
    venue: { name: 'v', address: '', district: 'd' },
    organizer: 'o',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

// Saturday 2026-09-12, 14:00 Stockholm (CEST, +02:00) → 12:00Z.
const SATURDAY_NOON = new Date('2026-09-12T12:00:00.000Z');

describe('splitByDateRange', () => {
  const todayStart = '2026-09-12T00:00:00.000Z';
  const todayEnd = '2026-09-13T00:00:00.000Z';

  test('event starting inside the window is primary', () => {
    const e = event({ startsAt: '2026-09-12T10:00:00.000Z' });
    const { primary, secondary } = splitByDateRange([e], 'today', SATURDAY_NOON);
    assert.deepEqual(primary, [e]);
    assert.deepEqual(secondary, []);
  });

  test('late-night event started yesterday, still live today → secondary', () => {
    // Club night: started Friday 20:00 STHLM, ends Saturday 01:00 STHLM.
    const clubNight = event({ startsAt: '2026-09-11T18:00:00.000Z', endsAt: '2026-09-11T23:00:00.000Z' });
    const { primary, secondary } = splitByDateRange([clubNight], 'today', SATURDAY_NOON);
    assert.deepEqual(primary, []);
    assert.deepEqual(secondary, [clubNight]);
  });

  test('ended-before-window and starts-after-window events match neither group', () => {
    const past = event({ startsAt: '2026-09-10T10:00:00.000Z', endsAt: '2026-09-10T12:00:00.000Z' });
    const future = event({ startsAt: '2026-09-14T10:00:00.000Z' });
    const { primary, secondary } = splitByDateRange([past, future], 'today', SATURDAY_NOON);
    assert.deepEqual(primary, []);
    assert.deepEqual(secondary, []);
  });

  test('long-running exhibition spanning today is secondary', () => {
    const exhibition = event({
      startsAt: '2026-08-01T00:00:00.000Z',
      endsAt: '2026-12-31T00:00:00.000Z',
    });
    const { primary, secondary } = splitByDateRange([exhibition], 'today', SATURDAY_NOON);
    assert.deepEqual(primary, []);
    assert.deepEqual(secondary, [exhibition]);
  });

  test('all returns everything as primary', () => {
    const e = event({ startsAt: '2026-01-01T00:00:00.000Z' });
    const { primary, secondary } = splitByDateRange([e], 'all', SATURDAY_NOON);
    assert.deepEqual(primary, [e]);
    assert.deepEqual(secondary, []);
  });
});

describe('filterByDateRange parity with splitByDateRange', () => {
  test('primary first, secondary after', () => {
    const startsToday = event({ id: 'a', startsAt: '2026-09-12T10:00:00.000Z' });
    const ongoing = event({ id: 'b', startsAt: '2026-09-11T18:00:00.000Z', endsAt: '2026-09-11T23:00:00.000Z' });
    const combined = filterByDateRange([ongoing, startsToday], 'today', SATURDAY_NOON);
    assert.deepEqual(
      combined.map((e) => e.id),
      ['a', 'b'],
    );
  });
});
