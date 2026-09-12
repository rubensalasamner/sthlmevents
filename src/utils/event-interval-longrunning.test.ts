import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import { isLongRunning, isOngoing, LONG_RUNNING_MS } from '@/utils/event-interval';

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

describe('isLongRunning', () => {
  const now = new Date('2026-09-12T12:00:00.000Z');

  test('months-long running exhibition is long-running', () => {
    const e = event({ startsAt: '2026-08-01T00:00:00Z', endsAt: '2026-12-31T00:00:00Z' });
    assert.equal(isLongRunning(e, now), true);
    assert.equal(isOngoing(e, now), true);
  });

  test('weekend festival (short multi-day run) is not long-running', () => {
    const festival = event({ startsAt: '2026-09-10T10:00:00Z', endsAt: '2026-09-14T23:00:00Z' });
    assert.equal(isLongRunning(festival, now), false);
  });

  test('future event, however long, is not long-running', () => {
    const upcoming = event({ startsAt: '2026-12-01T00:00:00Z', endsAt: '2027-03-01T00:00:00Z' });
    assert.equal(isLongRunning(upcoming, now), false);
  });

  test('one-shot gig already ended is not long-running', () => {
    const past = event({ startsAt: '2026-09-01T18:00:00Z', endsAt: '2026-09-01T23:00:00Z' });
    assert.equal(isLongRunning(past, now), false);
  });

  test('30-day boundary is inclusive', () => {
    const exact = event({
      startsAt: new Date(now.getTime() - LONG_RUNNING_MS).toISOString(),
      endsAt: now.toISOString(),
    });
    assert.equal(isLongRunning(exact, now), true);
  });

  test('short one-shot event running right now is not long-running', () => {
    const gig = event({
      startsAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    });
    assert.equal(isLongRunning(gig, now), false);
  });
});
