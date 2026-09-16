import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import { distanceKm, filterByDistance, sortByDistance } from './geo.js';

function event(
  id: string,
  latitude: number | undefined,
  longitude: number | undefined,
): StockholmEvent {
  return {
    id,
    title: id,
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-12T10:00:00.000Z',
    venue: { name: 'v', address: '', district: 'd', latitude, longitude },
    organizer: 'o',
    source: 's',
    sourceId: id,
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
  };
}

// ~1 km east of Stockholm city centre (59.3293, 18.0686).
const ORIGIN = { latitude: 59.3293, longitude: 18.0686 };
const NEAR = event('near', 59.332, 18.075); // ~0.5 km
const MID = event('mid', 59.34, 18.09); // ~1.7 km
const FAR = event('far', 59.4, 18.2); // ~12 km
const NO_COORDS = event('none', undefined, undefined);

describe('distanceKm', () => {
  test('same point is ~0', () => {
    assert.ok(distanceKm(ORIGIN, ORIGIN) < 0.001);
  });

  test('known short hop is under 1 km', () => {
    const km = distanceKm(ORIGIN, { latitude: NEAR.venue.latitude!, longitude: NEAR.venue.longitude! });
    assert.ok(km > 0.3 && km < 0.8, `got ${km}`);
  });
});

describe('filterByDistance', () => {
  test('null radius keeps any event with coordinates', () => {
    const result = filterByDistance([NEAR, FAR, NO_COORDS], ORIGIN, null);
    assert.deepEqual(
      result.map((e) => e.id),
      ['near', 'far'],
    );
  });

  test('2 km radius drops far events', () => {
    const result = filterByDistance([NEAR, MID, FAR], ORIGIN, 2);
    assert.deepEqual(
      result.map((e) => e.id),
      ['near', 'mid'],
    );
  });
});

describe('sortByDistance', () => {
  test('nearest first, stable by id on equal distance', () => {
    const result = sortByDistance([FAR, NEAR, MID], ORIGIN);
    assert.deepEqual(
      result.map((e) => e.id),
      ['near', 'mid', 'far'],
    );
  });
});
