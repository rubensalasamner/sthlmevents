import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildMagazine, featuredWindowRailTitle } from './magazine-rails.js';
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
    const { hero, rails } = buildMagazine([featured, a, b], 'Tonight');
    assert.equal(hero?.id, 'feat');
    const ids = rails.flatMap((rail) => rail.events.map((e) => e.id));
    assert.equal(ids.includes('feat'), false);
  });

  test('skips rails with fewer than two unused matches', () => {
    const events = [
      event({ id: 'hero', isFeatured: true, category: 'other' }),
      // Window will claim these first (RAIL_SIZE = 8).
      ...Array.from({ length: 8 }, (_, i) =>
        event({ id: `w${i}`, category: 'other', priceSek: 100 }),
      ),
      // Leftovers for Music; nightlife never reaches MIN_RAIL.
      event({ id: 'n1', category: 'nightlife' }),
      event({ id: 'm1', category: 'music' }),
      event({ id: 'm2', category: 'music' }),
    ];
    const { rails } = buildMagazine(events, 'Tonight');
    assert.equal(rails.some((rail) => rail.id === 'nightlife'), false);
    assert.equal(rails.some((rail) => rail.id === 'music'), true);
  });

  test('window rail is featured density; others are compact', () => {
    const events = [
      event({ id: 'h', isFeatured: true }),
      ...Array.from({ length: 8 }, (_, i) =>
        event({ id: `paid${i}`, category: 'music', priceSek: 100 }),
      ),
      event({ id: 'e', category: 'art', priceSek: 0 }),
      event({ id: 'f', category: 'art', priceSek: 0 }),
    ];
    const { rails } = buildMagazine(events, 'This weekend');
    const window = rails.find((rail) => rail.id === 'window');
    const free = rails.find((rail) => rail.id === 'free');
    assert.equal(window?.density, 'featured');
    assert.equal(window?.title, 'More this weekend');
    assert.equal(free?.density, 'compact');
  });

  test('an event appears in at most one rail', () => {
    const events = [
      event({ id: 'h', isFeatured: true }),
      // Fill the window rail with paid picks.
      ...Array.from({ length: 8 }, (_, i) =>
        event({ id: `paid${i}`, category: 'music', priceSek: 150 }),
      ),
      // Free leftovers — must not also appear in window.
      event({ id: 'free1', category: 'art', priceSek: 0 }),
      event({ id: 'free2', category: 'art', priceSek: 0 }),
      event({ id: 'free3', category: 'art', priceSek: 0 }),
    ];
    const { hero, rails } = buildMagazine(events, 'This weekend');
    const seen = new Set<string>(hero ? [hero.id] : []);
    for (const rail of rails) {
      for (const item of rail.events) {
        assert.equal(seen.has(item.id), false, `${item.id} duplicated in ${rail.id}`);
        seen.add(item.id);
      }
    }
    const window = rails.find((rail) => rail.id === 'window');
    const free = rails.find((rail) => rail.id === 'free');
    assert.ok(window);
    assert.ok(free);
    assert.deepEqual(
      free!.events.map((e) => e.id).sort(),
      ['free1', 'free2', 'free3'],
    );
  });

  test('markets and sales rails stay separate', () => {
    const events = [
      event({ id: 'h', isFeatured: true, category: 'other' }),
      ...Array.from({ length: 8 }, (_, i) =>
        event({ id: `pad${i}`, category: 'music', priceSek: 100 }),
      ),
      event({ id: 'm1', category: 'market' }),
      event({ id: 'm2', category: 'market' }),
      event({ id: 'p1', category: 'popup' }),
      event({ id: 'p2', category: 'popup' }),
    ];
    const { rails } = buildMagazine(events, 'This weekend');
    const market = rails.find((rail) => rail.id === 'market');
    const popup = rails.find((rail) => rail.id === 'popup');
    assert.equal(market?.title, 'Markets & fleas');
    assert.equal(popup?.title, 'Sales & pop-ups');
    assert.deepEqual(market?.events.map((e) => e.id).sort(), ['m1', 'm2']);
    assert.deepEqual(popup?.events.map((e) => e.id).sort(), ['p1', 'p2']);
  });

  test('empty feed yields no hero and no rails', () => {
    const { hero, rails } = buildMagazine([], 'Tonight');
    assert.equal(hero, null);
    assert.deepEqual(rails, []);
  });
});

describe('featuredWindowRailTitle', () => {
  test('prefixes More for dated windows', () => {
    assert.equal(featuredWindowRailTitle('This weekend'), 'More this weekend');
    assert.equal(featuredWindowRailTitle('Today'), 'More today');
    assert.equal(featuredWindowRailTitle('This week'), 'More this week');
  });

  test('All events becomes Up next', () => {
    assert.equal(featuredWindowRailTitle('All events'), 'Up next');
  });
});
