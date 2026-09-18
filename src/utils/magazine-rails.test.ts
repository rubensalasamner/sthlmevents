import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildMagazine } from './magazine-rails.js';
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

describe('buildMagazine', () => {
  test('hero is the featured event when one exists', () => {
    const featured = event({ id: 'feat', isFeatured: true, title: 'Hero' });
    const other = event({ id: 'a', category: 'music' });
    const other2 = event({ id: 'b', category: 'music' });
    const { hero } = buildMagazine([other, featured, other2], 'Tonight');
    assert.equal(hero?.id, 'feat');
  });

  test('hero falls back to the first feed item', () => {
    const a = event({ id: 'a' });
    const b = event({ id: 'b' });
    const { hero } = buildMagazine([a, b], 'Tonight');
    assert.equal(hero?.id, 'a');
  });

  test('hero is excluded from rails', () => {
    const featured = event({ id: 'feat', isFeatured: true, category: 'music' });
    const a = event({ id: 'a', category: 'music' });
    const b = event({ id: 'b', category: 'music' });
    const { rails } = buildMagazine([featured, a, b], 'Tonight');
    const music = rails.find((rail) => rail.id === 'music');
    assert.deepEqual(music?.events.map((e) => e.id), ['a', 'b']);
  });

  test('skips rails with fewer than two events', () => {
    const { rails } = buildMagazine(
      [
        event({ id: '1', category: 'nightlife' }),
        event({ id: '2', category: 'music' }),
        event({ id: '3', category: 'music' }),
      ],
      'Tonight',
    );
    assert.equal(rails.some((rail) => rail.id === 'nightlife'), false);
    assert.equal(rails.some((rail) => rail.id === 'music'), true);
  });

  test('empty feed yields no hero and no rails', () => {
    const { hero, rails } = buildMagazine([], 'Tonight');
    assert.equal(hero, null);
    assert.deepEqual(rails, []);
  });
});
