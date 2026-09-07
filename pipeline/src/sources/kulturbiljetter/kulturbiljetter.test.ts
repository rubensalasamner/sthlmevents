import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { KulturbiljetterAdapter, apiKey } from './adapter.js';
import { mapKulturbiljetterCategory } from './category-map.js';
import { isMappableShowing, mapKulturbiljetterEvent, pickImage } from './mapper.js';
import type { KbDate, KbEventDetail, KbListResponse, KbLocation } from './types.js';

const listFixture = JSON.parse(
  readFileSync(new URL('../../../fixtures/kulturbiljetter.list.json', import.meta.url), 'utf8'),
) as KbListResponse;

const detailsFixture = JSON.parse(
  readFileSync(new URL('../../../fixtures/kulturbiljetter.details.json', import.meta.url), 'utf8'),
) as Record<string, KbEventDetail>;

/**
 * The adapter gates showings to "today onwards", but fixture timestamps are
 * static — shift every showing into the near future so adapter-level tests
 * stay valid regardless of when they run.
 */
function futureDatedDetails(): Record<string, KbEventDetail> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const base = Math.floor(tomorrow.getTime() / 1000);

  return Object.fromEntries(
    Object.entries(detailsFixture).map(([id, detail]) => [
      id,
      {
        ...detail,
        dates: Object.fromEntries(
          Object.entries(detail.dates ?? {}).map(([key, showing], index) => [
            key,
            { ...showing, unixtime_open: base + index * 86_400, unixtime_start: base + index * 86_400 },
          ]),
        ),
      },
    ]),
  );
}

/** Fetch stub serving the list fixture at `/` and detail fixtures per id. */
function fixtureFetch(details: Record<string, KbEventDetail> = futureDatedDetails()): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const body = url.endsWith('/api/v3/events/')
      ? listFixture
      : details[url.match(/events\/(\d+)$/)?.[1] ?? ''];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

describe('mapKulturbiljetterCategory', () => {
  test('maps Swedish and English keywords', () => {
    assert.equal(mapKulturbiljetterCategory('Konsert: Bach i Tyska kyrkan'), 'music');
    assert.equal(mapKulturbiljetterCategory('Standup med Loco Loco'), 'comedy');
    assert.equal(mapKulturbiljetterCategory('Utställning: Norrsken'), 'art');
    assert.equal(mapKulturbiljetterCategory('Föreläsning om hösten'), 'other');
    assert.equal(mapKulturbiljetterCategory('Okategoriserad quizkväll'), 'other');
  });
});

describe('mapKulturbiljetterEvent', () => {
  const midsummer = detailsFixture['1291']!;
  const standup = detailsFixture['1293']!;
  // Fixture showings are dated 2026-07-21..29 (Stockholm local); pin "today"
  // before the first one so date gating is deterministic in tests.
  const TODAY = '2026-07-21';

  test('one output per qualifying showing, filtered to Stockholm', () => {
    const events = mapKulturbiljetterEvent(midsummer, TODAY);
    // 2 Stockholm showings map; the Uppsala showing is dropped.
    assert.equal(events.length, 2);
    assert.ok(events.every((event) => event.source === 'kulturbiljetter'));
  });

  test('showing events carry showing-scoped ids and checkout urls', () => {
    const events = mapKulturbiljetterEvent(midsummer, TODAY);
    assert.equal(events[0]!.id, 'kulturbiljetter:en-midsummernattsdrom-1021');
    assert.equal(events[1]!.id, 'kulturbiljetter:en-midsummernattsdrom-1022');
    assert.equal(
      events[0]!.ticketUrl,
      'https://kulturbiljetter.se/varukorg/1291/1021/en-midsummernattsdrom/',
    );
    assert.equal(events[0]!.sourceUrl, 'https://kulturbiljetter.se/evenemang/1291/en-midsummernattsdrom/');
  });

  test('maps venue, price, organizer and image', () => {
    const event = mapKulturbiljetterEvent(midsummer, TODAY)[0]!;
    assert.equal(event.title, 'En midsummernattsdröm');
    assert.equal(event.category, 'other');
    assert.equal(event.venue.name, 'Galateateatern');
    assert.equal(event.venue.district, 'Södermalm');
    assert.equal(event.priceSek, 150);
    assert.equal(event.organizer, 'Stockholms Teaterkompani');
    assert.equal(event.imageUrl, 'https://kulturbiljetter.se/storage/event-1291-hero.jpg');
    assert.match(event.description, /Shakespeares älskade komedi om förvillelser/);
    assert.equal(event.venue.latitude, undefined);
  });

  test('null price maps to undefined and missing images fall back by category', () => {
    const event = mapKulturbiljetterEvent(standup, TODAY)[0]!;
    assert.equal(event.priceSek, undefined);
    assert.equal(event.category, 'comedy');
    assert.match(event.imageUrl, /^https:\/\/images\.unsplash\.com\//);
  });

  test('drops events with no showings in target cities', () => {
    assert.deepEqual(mapKulturbiljetterEvent(detailsFixture['1294']!, TODAY), []);
  });

  test('pickImage reads the numeric-keyed map', () => {
    assert.equal(pickImage({ 0: 'https://x/1.jpg' }), 'https://x/1.jpg');
    assert.equal(pickImage(null), undefined);
  });

  test('isMappableShowing requires a start time; unknown city defaults in', () => {
    const location: KbLocation = { location_id: 1, city: 'Stockholm' };
    const noStart: KbDate = { date_id: 1, location_id: 1, unixtime_start: Number.NaN };
    const good: KbDate = { date_id: 2, location_id: 1, unixtime_start: 1784613600 }; // 2026-07-21 local
    const unknownVenue: KbDate = { date_id: 3, unixtime_start: 1784613600 };
    assert.equal(isMappableShowing(noStart, location, '2026-07-21'), false);
    assert.equal(isMappableShowing(good, location, '2026-07-21'), true);
    assert.equal(isMappableShowing(unknownVenue, undefined, '2026-07-21'), true);
  });

  test('isMappableShowing drops past showings but keeps today', () => {
    const location: KbLocation = { location_id: 1, city: 'Stockholm' };
    const today: KbDate = { date_id: 1, location_id: 1, unixtime_start: 1784700000 }; // 2026-07-22 local
    const yesterday: KbDate = { date_id: 2, location_id: 1, unixtime_start: 1784613600 }; // 2026-07-21 local
    assert.equal(isMappableShowing(today, location, '2026-07-22'), true);
    assert.equal(isMappableShowing(yesterday, location, '2026-07-22'), false);
  });
});

describe('KulturbiljetterAdapter', () => {
  const original = process.env.KULTURBILJETTER_API_KEY;

  beforeEach(() => {
    process.env.KULTURBILJETTER_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (original === undefined) delete process.env.KULTURBILJETTER_API_KEY;
    else process.env.KULTURBILJETTER_API_KEY = original;
  });

  test('fetches list then details and maps Stockholm events', async () => {
    const events = await new KulturbiljetterAdapter().fetch({ fetchImpl: fixtureFetch() });
    // 1291 -> 2 showings, 1293 -> 1 showing, 1294 -> 0 (Göteborg).
    assert.equal(events.length, 3);
    assert.ok(events.every((event) => event.source === 'kulturbiljetter'));
  });

  test('skips details that vanished after listing (404)', async () => {
    const fetchWith404 = (async (input: string | URL | Request) => {
      const url = String(input);
      if (/events\/1293$/.test(url)) {
        return new Response('not found', { status: 404 });
      }
      return fixtureFetch()(input);
    }) as unknown as typeof fetch;

    const events = await new KulturbiljetterAdapter().fetch({ fetchImpl: fetchWith404 });
    assert.equal(events.length, 2);
  });

  test('throws a clear error when the API key is missing', async () => {
    delete process.env.KULTURBILJETTER_API_KEY;
    await assert.rejects(() => new KulturbiljetterAdapter().fetch({ fetchImpl: fixtureFetch() }), /KULTURBILJETTER_API_KEY is not set/);
    assert.throws(apiKey, /KULTURBILJETTER_API_KEY is not set/);
  });

  test('maxPages caps how many detail fetches run', async () => {
    let detailCalls = 0;
    const counting = (async (input: string | URL | Request) => {
      const url = String(input);
      if (!url.endsWith('/api/v3/events/')) detailCalls += 1;
      return fixtureFetch()(input);
    }) as unknown as typeof fetch;

    await new KulturbiljetterAdapter().fetch({ fetchImpl: counting, maxPages: 1 });
    assert.equal(detailCalls, 1);
  });
});
