import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { resolveSavedEvents, sameSnapshots, syncSnapshots } from './saved-events.js';
import type { StockholmEvent } from '@/types/event';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-10-07T17:00:00.000Z',
    venue: { name: 'v', address: '', district: 'd' },
    organizer: 'o',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-10-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

const NOW = new Date('2026-10-07T10:00:00.000Z');

function byId(...events: StockholmEvent[]): Map<string, StockholmEvent> {
  return new Map(events.map((e) => [e.id, e]));
}

describe('syncSnapshots', () => {
  test('captures live favourites', () => {
    const gig = event({ id: 'gig' });
    const next = syncSnapshots({}, new Set(['gig']), byId(gig), NOW);
    assert.deepEqual(Object.keys(next), ['gig']);
  });

  test('keeps the snapshot of a favourite the live feed dropped', () => {
    const ended = event({ id: 'ended', startsAt: '2026-10-05T17:00:00.000Z' });
    const next = syncSnapshots({ ended }, new Set(['ended']), byId(), NOW);
    assert.equal(next.ended, ended);
  });

  test('live copy replaces a stale snapshot', () => {
    const stale = event({ id: 'gig', title: 'Old' });
    const fresh = event({ id: 'gig', title: 'New', updatedAt: '2026-10-06T00:00:00.000Z' });
    const next = syncSnapshots({ gig: stale }, new Set(['gig']), byId(fresh), NOW);
    assert.equal(next.gig?.title, 'New');
  });

  test('drops unfavourited and long-ended snapshots', () => {
    const removed = event({ id: 'removed' });
    const ancient = event({ id: 'ancient', startsAt: '2026-08-01T17:00:00.000Z' });
    const next = syncSnapshots({ removed, ancient }, new Set(['ancient']), byId(), NOW);
    assert.deepEqual(next, {});
  });
});

describe('sameSnapshots', () => {
  test('equal ids and updatedAt are the same', () => {
    const a = event({ id: 'a' });
    assert.equal(sameSnapshots({ a }, { a: { ...a } }), true);
  });

  test('a newer updatedAt differs', () => {
    const a = event({ id: 'a' });
    assert.equal(
      sameSnapshots({ a }, { a: { ...a, updatedAt: '2026-10-06T00:00:00.000Z' } }),
      false,
    );
  });
});

describe('resolveSavedEvents', () => {
  test('prefers live, falls back to snapshot, skips unknown ids', () => {
    const live = event({ id: 'live', title: 'Live' });
    const ended = event({ id: 'ended' });
    const resolved = resolveSavedEvents(
      new Set(['live', 'ended', 'unknown']),
      byId(live),
      { live: event({ id: 'live', title: 'Snapshot' }), ended },
    );
    assert.deepEqual(
      resolved.map((e) => e.title),
      ['Live', 'Title'],
    );
  });
});
