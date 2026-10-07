import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import {
  defaultDateRange,
  filterByDateRange,
  splitByDateRange,
  stockholmWeekday,
  windowFor,
} from './date-range.js';

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
    const ongoing = event({
      id: 'b',
      startsAt: '2026-09-11T18:00:00.000Z',
      endsAt: '2026-09-11T23:00:00.000Z',
    });
    const combined = filterByDateRange([ongoing, startsToday], 'today', SATURDAY_NOON);
    assert.deepEqual(
      combined.map((e) => e.id),
      ['a', 'b'],
    );
  });
});

describe('windowFor weekend (Fri 00:00 → Mon 00:00 Stockholm)', () => {
  // CEST: Stockholm midnight = 22:00Z the previous day.
  // Week: Fri 18 Sep – Mon 21 Sep 2026.
  const FRIDAY_MIDNIGHT = '2026-09-17T22:00:00.000Z';
  const MONDAY_MIDNIGHT = '2026-09-20T22:00:00.000Z';

  test('Mon–Thu point at the coming Friday', () => {
    for (const now of ['2026-09-14T10:00:00.000Z', '2026-09-17T10:00:00.000Z']) {
      const window = windowFor('weekend', new Date(now));
      assert.equal(window?.from.toISOString(), FRIDAY_MIDNIGHT);
      assert.equal(window?.to.toISOString(), MONDAY_MIDNIGHT);
    }
  });

  test('inside the weekend the window starts today', () => {
    const saturday = windowFor('weekend', new Date('2026-09-19T10:00:00.000Z'));
    assert.equal(saturday?.from.toISOString(), '2026-09-18T22:00:00.000Z');
    assert.equal(saturday?.to.toISOString(), MONDAY_MIDNIGHT);
    const sunday = windowFor('weekend', new Date('2026-09-20T10:00:00.000Z'));
    assert.equal(sunday?.from.toISOString(), '2026-09-19T22:00:00.000Z');
    assert.equal(sunday?.to.toISOString(), MONDAY_MIDNIGHT);
  });

  test('Friday-night gig is inside the weekend', () => {
    const gig = event({ startsAt: '2026-09-18T18:00:00.000Z' });
    const { primary } = splitByDateRange([gig], 'weekend', new Date('2026-09-17T10:00:00.000Z'));
    assert.deepEqual(primary, [gig]);
  });
});

describe('defaultDateRange (Stockholm weekday)', () => {
  // Civil dates in Stockholm; times chosen so UTC still lands on that local day.
  test('Mon–Thu → today', () => {
    assert.equal(defaultDateRange(new Date('2026-09-14T10:00:00.000Z')), 'today'); // Mon
    assert.equal(defaultDateRange(new Date('2026-09-16T10:00:00.000Z')), 'today'); // Wed
    assert.equal(defaultDateRange(new Date('2026-09-17T10:00:00.000Z')), 'today'); // Thu
  });

  test('Fri–Sun → weekend', () => {
    assert.equal(defaultDateRange(new Date('2026-09-18T10:00:00.000Z')), 'weekend'); // Fri
    assert.equal(defaultDateRange(new Date('2026-09-19T10:00:00.000Z')), 'weekend'); // Sat
    assert.equal(defaultDateRange(new Date('2026-09-20T10:00:00.000Z')), 'weekend'); // Sun
  });

  test('stockholmWeekday matches civil calendar, not UTC midnight trap', () => {
    // 2026-09-16 00:30 CEST = 2026-09-15T22:30Z — still Wednesday in Stockholm.
    assert.equal(stockholmWeekday(new Date('2026-09-15T22:30:00.000Z')), 3);
  });
});
