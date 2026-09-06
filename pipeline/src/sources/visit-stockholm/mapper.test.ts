import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { stockholmLocalToUtcIso } from '../../shared/time.js';
import { mapVisitStockholmCategory } from './category-map.js';
import { mapVisitStockholmEvent } from './mapper.js';
import type { VsEvent, VsEventsResponse } from './types.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../../fixtures/visit-stockholm.sample.json', import.meta.url), 'utf8'),
) as VsEventsResponse;

describe('mapVisitStockholmCategory', () => {
  test('maps known slugs to internal categories', () => {
    assert.equal(mapVisitStockholmCategory(['music']), 'music');
    assert.equal(mapVisitStockholmCategory(['clubs-parties']), 'nightlife');
    assert.equal(mapVisitStockholmCategory(['exhibitions']), 'art');
    assert.equal(mapVisitStockholmCategory(['eat-drink']), 'food');
    assert.equal(mapVisitStockholmCategory(['fairs']), 'market');
  });

  test('falls back to "other" for unknown slugs', () => {
    assert.equal(mapVisitStockholmCategory(['totally-unknown']), 'other');
    assert.equal(mapVisitStockholmCategory([]), 'other');
  });

  test('picks the first recognised slug', () => {
    assert.equal(mapVisitStockholmCategory(['unknown', 'music']), 'music');
  });

  test('resolves by priority, not by API array order', () => {
    assert.equal(mapVisitStockholmCategory(['eat-drink', 'music']), 'music');
    assert.equal(mapVisitStockholmCategory(['music', 'eat-drink']), 'music');
    assert.equal(mapVisitStockholmCategory(['guided-tours', 'exhibitions']), 'art');
  });
});

describe('stockholmLocalToUtcIso', () => {
  test('applies summer (+02:00) offset', () => {
    assert.equal(stockholmLocalToUtcIso('2026-07-01', '12:00'), '2026-07-01T10:00:00.000Z');
  });

  test('applies winter (+01:00) offset', () => {
    assert.equal(stockholmLocalToUtcIso('2026-01-01', '12:00'), '2026-01-01T11:00:00.000Z');
  });

  test('treats missing time as local midnight', () => {
    assert.equal(stockholmLocalToUtcIso('2026-07-01'), '2026-06-30T22:00:00.000Z');
  });
});

describe('mapVisitStockholmEvent', () => {
  test('maps every fixture event without throwing and yields valid instants', () => {
    for (const raw of fixture.results) {
      const event = mapVisitStockholmEvent(raw);
      assert.ok(event.title.length > 0, 'title should be present');
      assert.equal(event.source, 'visit-stockholm');
      assert.equal(event.sourceId, raw.id);
      assert.equal(event.id, `visit-stockholm:${raw.id}`);
      assert.ok(!Number.isNaN(Date.parse(event.startsAt)), 'startsAt should be a valid date');
      assert.equal(event.priceSek, undefined);
      assert.ok(event.imageUrl.startsWith('https://'), 'imageUrl fallback should be set');
      assert.equal(event.venue.latitude, raw.location?.latitude);
      assert.equal(event.venue.longitude, raw.location?.longitude);
    }
  });

  test('prefers English title and derives ticket + source urls', () => {
    const raw: VsEvent = {
      ...fixture.results[0]!,
      id: '11111111-2222-3333-4444-555555555555',
      title: { en: 'English Title', sv: 'Svensk Titel' },
      description: { en: 'English desc', sv: 'Svensk' },
      external_website_url: 'https://organizer.example/tickets',
      start_date: '2026-07-10',
      end_date: '2026-07-10',
      start_time: '19:30',
      end_time: '22:00',
    };

    const event = mapVisitStockholmEvent(raw);
    assert.equal(event.title, 'English Title');
    assert.equal(event.ticketUrl, 'https://organizer.example/tickets');
    assert.equal(
      event.sourceUrl,
      'https://api.visitstockholm.com/api/public-v1/events/11111111-2222-3333-4444-555555555555/',
    );
    assert.equal(event.startsAt, '2026-07-10T17:30:00.000Z');
    assert.equal(event.endsAt, '2026-07-10T20:00:00.000Z');
  });

  test('falls back to Swedish title when English missing', () => {
    const raw: VsEvent = {
      ...fixture.results[0]!,
      title: { sv: 'Endast Svenska' },
    };
    assert.equal(mapVisitStockholmEvent(raw).title, 'Endast Svenska');
  });

  test('an all-day single-day event spans its whole local day', () => {
    const raw: VsEvent = {
      ...fixture.results[0]!,
      start_date: '2026-07-10',
      end_date: '2026-07-10',
      start_time: null,
      end_time: null,
    };
    const event = mapVisitStockholmEvent(raw);
    // 2026-07-10 is CEST (+02:00): local 00:00 -> 22:00Z prev day, 23:59 -> 21:59Z.
    assert.equal(event.startsAt, '2026-07-09T22:00:00.000Z');
    assert.equal(event.endsAt, '2026-07-10T21:59:00.000Z');
  });

  test('a timed event keeps its exact start and has no synthetic end', () => {
    const raw: VsEvent = {
      ...fixture.results[0]!,
      start_date: '2026-07-10',
      end_date: null,
      start_time: '19:30',
      end_time: null,
    };
    const event = mapVisitStockholmEvent(raw);
    assert.equal(event.startsAt, '2026-07-10T17:30:00.000Z');
    assert.equal(event.endsAt, undefined);
  });
});
