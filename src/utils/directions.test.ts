import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { directionsQuery, directionsUrl } from './directions.js';
import { formatDistanceKm } from './geo.js';
import type { StockholmEvent } from '@/types/event';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-18T17:00:00.000Z',
    venue: { name: 'Fotografiska', address: 'Stadsgårdshamnen 22', district: 'Södermalm' },
    organizer: 'o',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

describe('formatDistanceKm', () => {
  test('formats sub-100m, metres, and kilometres', () => {
    assert.equal(formatDistanceKm(0.04), '< 100 m');
    assert.equal(formatDistanceKm(0.4), '400 m');
    assert.equal(formatDistanceKm(1.6), '1.6 km');
    assert.equal(formatDistanceKm(12.4), '12 km');
  });
});

describe('directionsUrl', () => {
  test('prefers coordinates', () => {
    const e = event({ venue: { name: 'v', address: 'a', district: 'd', latitude: 59.32, longitude: 18.08 } });
    assert.equal(directionsQuery(e), '59.32,18.08');
    assert.equal(directionsUrl(e, 'ios'), 'http://maps.apple.com/?daddr=59.32%2C18.08');
    assert.equal(directionsUrl(e, 'android'), 'geo:0,0?q=59.32%2C18.08');
  });

  test('falls back to venue text', () => {
    const e = event();
    assert.equal(directionsQuery(e), 'Fotografiska, Stadsgårdshamnen 22, Södermalm');
  });

  test('returns null when there is nothing to open', () => {
    const e = event({ venue: { name: '', address: '', district: '' } });
    assert.equal(directionsQuery(e), null);
    assert.equal(directionsUrl(e, 'web'), null);
  });
});
