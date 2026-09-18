import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { groupAgenda } from './agenda-groups.js';
import type { StockholmEvent } from '@/types/event';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-18T17:00:00.000Z',
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

// Friday 18 Sep 2026, 15:00 Stockholm (CEST) → 13:00Z.
const NOW = new Date('2026-09-18T13:00:00.000Z');

describe('groupAgenda', () => {
  test('ongoing programme events are Happening now', () => {
    const live = event({
      id: 'live',
      startsAt: '2026-09-18T10:00:00.000Z',
      endsAt: '2026-09-18T18:00:00.000Z',
    });
    const groups = groupAgenda([live], NOW);
    assert.equal(groups[0]?.id, 'now');
    assert.deepEqual(groups[0]?.events.map((e) => e.id), ['live']);
  });

  test('upcoming today buckets by clock hour', () => {
    const gig = event({ id: 'gig', startsAt: '2026-09-18T17:00:00.000Z' });
    const groups = groupAgenda([gig], NOW);
    assert.equal(groups[0]?.label, '19:00');
    assert.deepEqual(groups[0]?.events.map((e) => e.id), ['gig']);
  });

  test('tomorrow is a single group', () => {
    const brunch = event({ id: 'brunch', startsAt: '2026-09-19T09:00:00.000Z' });
    const groups = groupAgenda([brunch], NOW);
    assert.equal(groups[0]?.id, 'tomorrow');
    assert.equal(groups[0]?.label, 'Tomorrow');
  });

  test('long-running ongoing sits in Still on, not Happening now', () => {
    const exhibition = event({
      id: 'expo',
      startsAt: '2026-08-01T10:00:00.000Z',
      endsAt: '2026-12-01T18:00:00.000Z',
    });
    const groups = groupAgenda([exhibition], NOW);
    assert.equal(groups[0]?.id, 'still');
    assert.equal(groups.some((g) => g.id === 'now'), false);
  });
});
