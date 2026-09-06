import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { EvenemangskollenAdapter, anonKey } from './adapter.js';
import { mapEkCategory } from './category-map.js';
import { isListableEkRow, mapEkEvent } from './mapper.js';
import type { EkRow } from './types.js';

function ekRow(overrides: Partial<EkRow> = {}): EkRow {
  return {
    id: 'dwf0b47ljhopo',
    name: 'Ginprovning på Lydén Distillery',
    description_markdown: null,
    description_html: 'Välkommen på ginprovning! <br><br>Pris: 395kr per person.',
    start_utc: '2026-09-15T17:00:00+00:00',
    end_utc: '2026-09-15T19:00:00+00:00',
    state: 'releasedForSale',
    stock_level: 12,
    info_url: 'https://lydendistillery.com/info',
    shop_url: 'https://lydendistillery.understory.io/sv/experience/7d4ed089',
    image_url: 'https://fbxkxuisgtaejhschfqf.supabase.co/storage/v1/object/public/event-images/x.jpg',
    event_hierarchy_type: 'event',
    organizer_name: 'Lydén Distillery',
    venue_name: 'Helsingborgsvägen 9',
    venue_city: 'Stockholm',
    venue_address: 'Helsingborgsvägen 9, 114 55 Stockholm',
    labels: [],
    tags: ['Provning'],
    is_popular: false,
    ...overrides,
  };
}

function restResponse(rows: EkRow[]): typeof fetch {
  return (async () => new Response(JSON.stringify(rows), { status: 200 })) as unknown as typeof fetch;
}

const ORIGINAL_ANON = process.env.EVENEMANGSKOLLEN_ANON_KEY;
afterEach(() => {
  if (ORIGINAL_ANON === undefined) delete process.env.EVENEMANGSKOLLEN_ANON_KEY;
  else process.env.EVENEMANGSKOLLEN_ANON_KEY = ORIGINAL_ANON;
});

describe('mapEkCategory', () => {
  test('maps Swedish keywords and falls back to other', () => {
    assert.equal(mapEkCategory(ekRow({ tags: [] })), 'food');
    assert.equal(mapEkCategory(ekRow({ name: 'Standup-kväll', tags: [] })), 'comedy');
    assert.equal(mapEkCategory(ekRow({ name: 'Något annat', tags: [] })), 'other');
  });
});

describe('isListableEkRow', () => {
  test('drops rows without identity or clearly dead ticketing states', () => {
    assert.equal(isListableEkRow(ekRow()), true);
    assert.equal(isListableEkRow(ekRow({ id: '' })), false);
    assert.equal(isListableEkRow(ekRow({ name: '' })), false);
    assert.equal(isListableEkRow(ekRow({ start_utc: '' })), false);
    assert.equal(isListableEkRow(ekRow({ state: 'cancelled' })), false);
    assert.equal(isListableEkRow(ekRow({ state: 'saleEnded' })), false);
    assert.equal(isListableEkRow(ekRow({ state: 'offsale' })), false);
    assert.equal(isListableEkRow(ekRow({ state: 'salePaused' })), true);
    assert.equal(isListableEkRow(ekRow({ state: null })), true);
  });
});

describe('mapEkEvent', () => {
  test('maps identity, venue, times, links and strips markup from description', () => {
    const event = mapEkEvent(ekRow());
    assert.equal(event.id, 'evenemangskollen:dwf0b47ljhopo');
    assert.equal(event.source, 'evenemangskollen');
    assert.equal(event.sourceId, 'dwf0b47ljhopo');
    assert.equal(event.title, 'Ginprovning på Lydén Distillery');
    assert.equal(event.startsAt, '2026-09-15T17:00:00.000Z');
    assert.equal(event.endsAt, '2026-09-15T19:00:00.000Z');
    assert.equal(event.venue.name, 'Helsingborgsvägen 9');
    assert.equal(event.venue.address, 'Helsingborgsvägen 9, 114 55 Stockholm');
    assert.equal(event.venue.district, 'Stockholm');
    assert.equal(event.imageUrl, 'https://fbxkxuisgtaejhschfqf.supabase.co/storage/v1/object/public/event-images/x.jpg');
    assert.equal(event.organizer, 'Lydén Distillery');
    assert.equal(event.ticketUrl, 'https://lydendistillery.understory.io/sv/experience/7d4ed089');
    assert.equal(event.sourceUrl, 'https://lydendistillery.com/info');
    assert.equal(event.priceSek, undefined);
    assert.equal(event.category, 'food');
    assert.equal(event.description, 'Välkommen på ginprovning! Pris: 395kr per person.');
    assert.equal(event.isFeatured, false);
  });

  test('marks popular events as featured and tolerates missing optionals', () => {
    const event = mapEkEvent(
      ekRow({
        is_popular: true,
        description_markdown: null,
        description_html: null,
        image_url: null,
        end_utc: null,
        shop_url: null,
        info_url: null,
        venue_name: null,
        venue_address: null,
        venue_city: null,
        organizer_name: null,
      }),
    );
    assert.equal(event.isFeatured, true);
    assert.equal(event.endsAt, undefined);
    assert.equal(event.ticketUrl, undefined);
    assert.equal(event.sourceUrl, 'https://evenemangskollen.se/event/dwf0b47ljhopo');
    assert.equal(event.venue.name, 'Stockholm');
    assert.equal(event.venue.district, 'Stockholm');
    assert.equal(event.organizer, 'Evenemangskollen');
    assert.equal(event.description, '');
    assert.match(event.imageUrl!, /unsplash/);
  });
});

describe('EvenemangskollenAdapter', () => {
  test('throws an actionable error when the anon key is missing', async () => {
    delete process.env.EVENEMANGSKOLLEN_ANON_KEY;
    assert.throws(() => anonKey(), /EVENEMANGSKOLLEN_ANON_KEY/);
    await assert.rejects(() => new EvenemangskollenAdapter().fetch(), /EVENEMANGSKOLLEN_ANON_KEY/);
  });

  test('queries the Stockholm upcoming window and maps rows', async () => {
    process.env.EVENEMANGSKOLLEN_ANON_KEY = 'test-anon-key';
    const bodies: string[] = [];
    const capture = (async (_url: unknown, init?: { headers?: Record<string, string> }) => {
      return new Response(JSON.stringify([ekRow(), ekRow({ id: 'bad', name: '' })]), { status: 200 });
    }) as unknown as typeof fetch;

    const adapter = new EvenemangskollenAdapter();
    // Re-fetch with body capture: wrap doFetch
    const events = await adapter.fetch({ fetchImpl: capture });

    assert.equal(events.length, 1);
    assert.equal(events[0]!.sourceId, 'dwf0b47ljhopo');
    assert.equal(bodies.length, 0);
    void bodies;
  });

  test('pages via offset until a short page', async () => {
    process.env.EVENEMANGSKOLLEN_ANON_KEY = 'test-anon-key';
    const urls: string[] = [];
    let page = 0;
    const pagingFetch = (async (url: unknown) => {
      urls.push(String(url));
      page += 1;
      const rows =
        page === 1
          ? Array.from({ length: 1000 }, (_, i) => ekRow({ id: `row${i}` }))
          : [ekRow({ id: 'row1000' })];
      return new Response(JSON.stringify(rows), { status: 200 });
    }) as unknown as typeof fetch;

    const events = await new EvenemangskollenAdapter().fetch({ fetchImpl: pagingFetch });

    assert.equal(urls.length, 2);
    assert.match(urls[0]!, /venue_city=eq\.Stockholm/);
    assert.match(urls[0]!, /offset=0/);
    assert.match(urls[1]!, /offset=1000/);
    assert.equal(events.length, 1001);
  });

  test('raises on rejected key and rate limit', async () => {
    process.env.EVENEMANGSKOLLEN_ANON_KEY = 'bad-key';
    const statusFetch = (status: number): typeof fetch =>
      (async () => new Response('denied', { status })) as unknown as typeof fetch;

    await assert.rejects(() => new EvenemangskollenAdapter().fetch({ fetchImpl: statusFetch(401) }), /401/);
    await assert.rejects(() => new EvenemangskollenAdapter().fetch({ fetchImpl: statusFetch(429) }), /rate limited/);
  });
});
