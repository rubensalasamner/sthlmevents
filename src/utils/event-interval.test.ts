import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import { eventInterval, isOngoing, overlapsWindow } from '@/utils/event-interval';

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

describe('eventInterval', () => {
  test('a missing endsAt collapses to the start instant', () => {
    assert.deepEqual(eventInterval(event({ startsAt: '2026-09-05T09:00:00.000Z' })), {
      startMs: new Date('2026-09-05T09:00:00.000Z').getTime(),
      endMs: new Date('2026-09-05T09:00:00.000Z').getTime(),
    });
  });
});

describe('isOngoing', () => {
  const now = new Date('2026-09-10T12:00:00.000Z');

  test('true when the interval brackets now', () => {
    assert.equal(
      isOngoing(event({ startsAt: '2026-03-01T00:00:00.000Z', endsAt: '2026-12-31T23:59:59.000Z' }), now),
      true,
    );
  });

  test('false before start and after end', () => {
    assert.equal(isOngoing(event({ startsAt: '2026-09-11T00:00:00.000Z' }), now), false);
    assert.equal(
      isOngoing(event({ startsAt: '2026-09-09T00:00:00.000Z', endsAt: '2026-09-09T23:00:00.000Z' }), now),
      false,
    );
  });

  test('an all-day event is ongoing through its whole local day', () => {
    // Pipeline maps all-day events to the full local day: 22:00Z prev day ==
    // Sep 10 local midnight, ending 21:59Z == local 23:59.
    assert.equal(
      isOngoing(
        event({ startsAt: '2026-09-09T22:00:00.000Z', endsAt: '2026-09-10T21:59:00.000Z' }),
        now,
      ),
      true,
    );
  });
});

describe('overlapsWindow', () => {
  const window = { from: new Date('2026-09-10T00:00:00.000Z'), to: new Date('2026-09-11T00:00:00.000Z') };

  test('matches a one-shot event inside the window', () => {
    assert.equal(overlapsWindow(event({ startsAt: '2026-09-10T18:00:00.000Z' }), window), true);
  });

  test('matches a running exhibition that started before and ends after', () => {
    assert.equal(
      overlapsWindow(
        event({ startsAt: '2026-03-01T00:00:00.000Z', endsAt: '2028-03-26T23:59:00.000Z' }),
        window,
      ),
      true,
    );
  });

  test('does not match events entirely before or after the window', () => {
    assert.equal(
      overlapsWindow(event({ startsAt: '2026-09-09T09:00:00.000Z', endsAt: '2026-09-09T18:00:00.000Z' }), window),
      false,
    );
    assert.equal(overlapsWindow(event({ startsAt: '2026-09-11T09:00:00.000Z' }), window), false);
  });
});
