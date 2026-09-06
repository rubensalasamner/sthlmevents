import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '../shared/event.js';
import { dedupeEvents } from './dedup.js';

function event(overrides: Partial<StockholmEvent>): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-05T09:00:00.000Z',
    venue: { name: 'v', address: 'a', district: 'd' },
    organizer: 'o',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

describe('dedupeEvents', () => {
  test('merges same title + same Stockholm-local day across sources', () => {
    // Visit Stockholm all-day (22:00Z prev day == Sep 5 local) + timed loppis Sep 5 local.
    const vs = event({
      id: 'visit-stockholm:1',
      source: 'visit-stockholm',
      title: 'Hornstulls Loppis',
      startsAt: '2026-09-04T22:00:00.000Z',
      qualityScore: 50,
      description: 'A longer description from Visit Stockholm.',
      ticketUrl: undefined,
      venue: { name: 'Hornstull', address: 'x', district: 'Södermalm', latitude: 59.3, longitude: 18.0 },
    });
    const loppis = event({
      id: 'loppiskartan:hornstulls-loppis',
      source: 'loppiskartan',
      title: 'Hornstulls loppis',
      startsAt: '2026-09-05T09:00:00.000Z',
      qualityScore: 40,
      description: 'short',
      ticketUrl: 'https://loppiskartan.se/markets/hornstulls-loppis',
    });

    const { events, duplicatesRemoved } = dedupeEvents([vs, loppis]);
    assert.equal(events.length, 1);
    assert.equal(duplicatesRemoved, 1);

    const merged = events[0]!;
    assert.equal(merged.source, 'visit-stockholm', 'higher-scored record survives');
    assert.equal(merged.venue.latitude, 59.3, 'keeps coordinates');
    assert.equal(
      merged.ticketUrl,
      'https://loppiskartan.se/markets/hornstulls-loppis',
      'fills missing ticketUrl from the duplicate',
    );
    assert.match(merged.description, /Visit Stockholm/, 'keeps the longer description');
  });

  test('keeps events with the same title on different days', () => {
    const a = event({ id: 'a', startsAt: '2026-09-05T09:00:00.000Z' });
    const b = event({ id: 'b', startsAt: '2026-09-12T09:00:00.000Z' });
    assert.equal(dedupeEvents([a, b]).events.length, 2);
  });

  test('keeps different events on the same day', () => {
    const a = event({ id: 'a', title: 'Jazz Night' });
    const b = event({ id: 'b', title: 'Flea Market' });
    assert.equal(dedupeEvents([a, b]).events.length, 2);
  });

  test('merges near-identical titles across sources on the same day', () => {
    // Ticketmaster (coords, timed) vs Visit Stockholm (all-day, richer title).
    const tm = event({
      id: 'ticketmaster:1',
      source: 'ticketmaster',
      title: 'Håkan Hellström',
      startsAt: '2026-10-10T18:00:00.000Z',
      qualityScore: 55,
      venue: { name: 'Avicii Arena', address: '', district: 'Johanneshov', latitude: 59.2934, longitude: 18.0834 },
    });
    const vs = event({
      id: 'visit-stockholm:2',
      source: 'visit-stockholm',
      title: 'Håkan Hellström – Live på Avicii Arena',
      startsAt: '2026-10-10T18:00:00.000Z',
      qualityScore: 50,
      description: 'A much longer description from Visit Stockholm about the show.',
    });

    const { events, duplicatesRemoved } = dedupeEvents([tm, vs]);
    assert.equal(events.length, 1);
    assert.equal(duplicatesRemoved, 1);
    assert.equal(events[0]!.source, 'ticketmaster', 'record with coordinates survives');
    assert.match(events[0]!.description, /Visit Stockholm/, 'keeps the longer description');
  });

  test('does not merge different events sharing a venue and day', () => {
    const a = event({
      id: 'a',
      title: 'Techno Night',
      venue: { name: 'Slakthuset', address: '', district: 'd', latitude: 59.2918, longitude: 18.0794 },
    });
    const b = event({
      id: 'b',
      title: 'Sunday Poetry Slam',
      venue: { name: 'Slakthuset', address: '', district: 'd', latitude: 59.2918, longitude: 18.0794 },
    });
    assert.equal(dedupeEvents([a, b]).events.length, 2);
  });

  test('prefers a record with coordinates as primary', () => {
    const noCoords = event({ id: 'a', qualityScore: 90 });
    const withCoords = event({
      id: 'b',
      qualityScore: 50,
      venue: { name: 'v', address: 'a', district: 'd', latitude: 59.3, longitude: 18.0 },
    });
    const { events } = dedupeEvents([noCoords, withCoords]);
    assert.equal(events.length, 1);
    assert.equal(events[0]!.id, 'b');
  });
});
