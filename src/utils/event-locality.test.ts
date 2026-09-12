import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import { isLocalEvent, isOutOfTown, LOCAL_RADIUS_KM } from '@/utils/event-locality';
import { rankEvents } from '@/utils/ranking';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-12T18:00:00.000Z',
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

// Sergels torg, the CITY_CENTRE reference point.
const CENTRE = { latitude: 59.3311, longitude: 18.0593 };

function atDistance(kmEast: number) {
  // 1 degree of longitude at Stockholm's latitude ≈ 57.6 km.
  return { latitude: CENTRE.latitude, longitude: CENTRE.longitude + kmEast / 57.6 };
}

describe('isLocalEvent / isOutOfTown', () => {
  test('inner city is local', () => {
    const e = event({ venue: { name: 'Södra Teatern', address: '', district: 'Södermalm', ...CENTRE } });
    assert.equal(isLocalEvent(e), true);
    assert.equal(isOutOfTown(e), false);
  });

  test('Bromma (~7km) is local — city district, not out of town', () => {
    const e = event({ venue: { name: 'Brommaplan', address: '', district: 'Stockholm', latitude: 59.3383, longitude: 17.9419 } });
    assert.equal(isLocalEvent(e), true);
  });

  test('Solna/Sundbyberg (~6km) is local', () => {
    const e = event({ venue: { name: 'Omnipollos Kyrka', address: '', district: 'Sundbyberg', latitude: 59.3615, longitude: 17.9702 } });
    assert.equal(isLocalEvent(e), true);
  });

  test('just outside the radius is out of town (Kista ~10.3km, Farsta ~10.2km)', () => {
    const kista = event({ venue: { name: 'Kista bibliotek', address: '', district: 'Stockholm', latitude: 59.403, longitude: 17.9453 } });
    const farsta = event({ venue: { name: 'Farsta bibliotek', address: '', district: 'Stockholm', latitude: 59.2404, longitude: 18.0834 } });
    assert.equal(isOutOfTown(kista), true);
    assert.equal(isOutOfTown(farsta), true);
    assert.equal(isLocalEvent(kista), false);
  });

  test('clearly outside is out of town (Vaxholm ~19km)', () => {
    const e = event({ venue: { name: 'Västerhamnsplan', address: '', district: 'Vaxholm', latitude: 59.4028, longitude: 18.3574 } });
    assert.equal(isLocalEvent(e), false);
    assert.equal(isOutOfTown(e), true);
  });

  test('missing coordinates are treated as local (never demoted on missing data)', () => {
    const e = event({ venue: { name: 'v', address: '', district: 'd' } });
    assert.equal(isLocalEvent(e), true);
    assert.equal(isOutOfTown(e), false);
  });

  test('degenerate geocodes (0,0) from aggregators are out of town, not local', () => {
    const e = event({ venue: { name: 'v', address: '', district: 'Stockholm', latitude: 0, longitude: 0 } });
    assert.equal(isOutOfTown(e), true);
  });
});

describe('rankEvents out-of-town demotion', () => {
  test('out-of-town events sink below local ones with equal quality', () => {
    const local = event({ id: 'local', qualityScore: 50, venue: { name: 'v', address: '', district: 'd', ...CENTRE } });
    const away = event({ id: 'away', qualityScore: 50, venue: { name: 'v', address: '', district: 'd', ...atDistance(LOCAL_RADIUS_KM + 5) } });
    assert.deepEqual(rankEvents([away, local]).map((e) => e.id), ['local', 'away']);
  });

  test('featured beats out-of-town demotion', () => {
    const featuredAway = event({ id: 'away', isFeatured: true, venue: { name: 'v', address: '', district: 'd', ...atDistance(LOCAL_RADIUS_KM + 5) } });
    const local = event({ id: 'local', venue: { name: 'v', address: '', district: 'd', ...CENTRE } });
    assert.deepEqual(rankEvents([local, featuredAway]).map((e) => e.id), ['away', 'local']);
  });

  test('among out-of-town events, quality then date still order', () => {
    const low = event({ id: 'low', qualityScore: 40, venue: { name: 'v', address: '', district: 'd', ...atDistance(LOCAL_RADIUS_KM + 5) } });
    const high = event({ id: 'high', qualityScore: 90, venue: { name: 'v', address: '', district: 'd', ...atDistance(LOCAL_RADIUS_KM + 9) } });
    assert.deepEqual(rankEvents([low, high]).map((e) => e.id), ['high', 'low']);
  });

  test('higher-quality local still outranks lower-quality out-of-town only by demotion rule', () => {
    const strongLocal = event({ id: 'strong', qualityScore: 90, venue: { name: 'v', address: '', district: 'd', ...CENTRE } });
    const weakAway = event({ id: 'weak', qualityScore: 10, venue: { name: 'v', address: '', district: 'd', ...atDistance(LOCAL_RADIUS_KM + 5) } });
    assert.deepEqual(rankEvents([weakAway, strongLocal]).map((e) => e.id), ['strong', 'weak']);
  });
});
