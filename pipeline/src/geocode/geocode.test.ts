import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '../shared/event.js';
import { geocodeEvents, venueQueries } from './geocode-events.js';
import { NominatimGeocoder, type Coordinate, type Geocoder } from './geocoder.js';

function event(overrides: Partial<StockholmEvent> & { venue?: Partial<StockholmEvent['venue']> } = {}): StockholmEvent {
  const { venue, ...rest } = overrides;
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-05T09:00:00.000Z',
    venue: { name: 'Venue', address: '', district: 'd', ...venue },
    organizer: 'o',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...rest,
  };
}

/** In-memory geocoder that records every query it was asked, in order. */
class StubGeocoder implements Geocoder {
  readonly calls: string[] = [];
  constructor(private readonly table: Record<string, Coordinate | null>) {}
  async geocode(query: string): Promise<Coordinate | null> {
    this.calls.push(query);
    return this.table[query] ?? null;
  }
}

describe('venueQueries', () => {
  test('orders variants address -> name -> district', () => {
    const q = venueQueries(event({ venue: { name: 'Nalen', address: 'Regeringsgatan 74', district: 'Norrmalm' } }));
    assert.deepEqual(q, [
      'Regeringsgatan 74, Stockholm, Sweden',
      'Nalen, Stockholm, Sweden',
      'Norrmalm, Stockholm, Sweden',
    ]);
  });

  test('returns [] when nothing is more specific than the city', () => {
    assert.deepEqual(venueQueries(event({ venue: { name: 'Stockholm', address: '', district: 'Stockholm' } })), []);
  });

  test('does not repeat the district when it equals the venue name', () => {
    const q = venueQueries(event({ venue: { name: 'Kungsträdgården', address: '', district: 'Kungsträdgården' } }));
    assert.deepEqual(q, ['Kungsträdgården, Stockholm, Sweden']);
  });
});

describe('geocodeEvents', () => {
  test('falls through variants until the first hit', async () => {
    const a = event({ id: 'a', venue: { name: 'Mosebacketerrassen', address: 'Mosebacke torg 1-3', district: 'Slussen' } });
    const geocoder = new StubGeocoder({
      'Mosebacketerrassen, Stockholm, Sweden': { latitude: 59.3184, longitude: 18.0752 },
    });

    const { events, attempted, resolved } = await geocodeEvents([a], { geocoder, minIntervalMs: 0 });

    assert.deepEqual(geocoder.calls, [
      'Mosebacke torg 1-3, Stockholm, Sweden',
      'Mosebacketerrassen, Stockholm, Sweden',
    ], 'address missed, venue name hit');
    assert.equal(attempted, 1);
    assert.equal(resolved, 1);
    assert.equal(events[0]!.venue.latitude, 59.3184);
  });

  test('fills only events missing coordinates and dedups repeated venues', async () => {
    const a = event({ id: 'a', venue: { name: 'Nalen', address: '', district: 'Norrmalm' } });
    const b = event({ id: 'b', venue: { name: 'Nalen', address: '', district: 'Norrmalm' } });
    const withCoords = event({ id: 'c', venue: { name: 'Debaser', address: '', district: 'd', latitude: 59.31, longitude: 18.07 } });

    const geocoder = new StubGeocoder({ 'Nalen, Stockholm, Sweden': { latitude: 59.3376, longitude: 18.0662 } });
    const { events, attempted, resolved } = await geocodeEvents([a, b, withCoords], { geocoder, minIntervalMs: 0 });

    assert.equal(geocoder.calls.length, 1, 'shared venue geocoded once');
    assert.equal(attempted, 1);
    assert.equal(resolved, 2);
    assert.equal(events[0]!.venue.latitude, 59.3376);
    assert.equal(events[1]!.venue.longitude, 18.0662);
    assert.equal(events[2]!.venue.latitude, 59.31, 'already-located event untouched');
  });

  test('leaves an event unchanged when no variant geocodes', async () => {
    const a = event({ id: 'a', venue: { name: 'Nowhere', address: '', district: 'd' } });
    const geocoder = new StubGeocoder({});
    const { events, resolved } = await geocodeEvents([a], { geocoder, minIntervalMs: 0 });
    assert.equal(resolved, 0);
    assert.equal(events[0]!.venue.latitude, undefined);
  });

  test('skips lookups for city-only venues', async () => {
    const a = event({ id: 'a', venue: { name: 'Stockholm', address: '', district: 'Stockholm' } });
    const geocoder = new StubGeocoder({});
    const { attempted } = await geocodeEvents([a], { geocoder, minIntervalMs: 0 });
    assert.equal(attempted, 0);
    assert.equal(geocoder.calls.length, 0);
  });
});

describe('NominatimGeocoder', () => {
  function jsonFetch(body: unknown, status = 200): typeof fetch {
    return (async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
  }

  test('parses the first hit into a coordinate', async () => {
    const geocoder = new NominatimGeocoder({
      fetchImpl: jsonFetch([{ lat: '59.3376', lon: '18.0662' }]),
    });
    assert.deepEqual(await geocoder.geocode('Nalen, Stockholm, Sweden'), { latitude: 59.3376, longitude: 18.0662 });
  });

  test('returns null on an empty result set', async () => {
    const geocoder = new NominatimGeocoder({ fetchImpl: jsonFetch([]) });
    assert.equal(await geocoder.geocode('Nowhere'), null);
  });

  test('returns null on a non-200 response', async () => {
    const geocoder = new NominatimGeocoder({ fetchImpl: jsonFetch({}, 503) });
    assert.equal(await geocoder.geocode('Nalen'), null);
  });
});
