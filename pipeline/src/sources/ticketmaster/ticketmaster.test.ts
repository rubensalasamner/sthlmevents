import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { TicketmasterAdapter } from './adapter.js';
import { mapTicketmasterCategory, primaryClassification } from './category-map.js';
import { mapTicketmasterEvent, resolveTicketmasterStart } from './mapper.js';
import type { TmEvent, TmEventsResponse } from './types.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../../fixtures/ticketmaster.sample.json', import.meta.url), 'utf8'),
) as TmEventsResponse;

const events = fixture._embedded!.events!;

function fixtureFetch(): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(fixture), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;
}

describe('resolveTicketmasterStart', () => {
  test('prefers the UTC dateTime when a real time is known', () => {
    assert.equal(resolveTicketmasterStart({ dateTime: '2026-09-03T16:30:00Z' }), '2026-09-03T16:30:00.000Z');
  });

  test('falls back to a Stockholm-local all-day event when time is TBA', () => {
    // 2026-09-20 is CEST (+02:00): local midnight -> 22:00 UTC the day before.
    assert.equal(
      resolveTicketmasterStart({ localDate: '2026-09-20', timeTBA: true }),
      '2026-09-19T22:00:00.000Z',
    );
  });

  test('returns undefined when the date is TBD', () => {
    assert.equal(resolveTicketmasterStart({ dateTBD: true }), undefined);
  });
});

describe('mapTicketmasterCategory', () => {
  test('maps by segment with genre overrides', () => {
    assert.equal(mapTicketmasterCategory({ segment: { name: 'Music' } }), 'music');
    assert.equal(mapTicketmasterCategory({ segment: { name: 'Sports' } }), 'sports');
    assert.equal(mapTicketmasterCategory({ segment: { name: 'Arts & Theatre' } }), 'theatre');
    assert.equal(
      mapTicketmasterCategory({ segment: { name: 'Arts & Theatre' }, genre: { name: 'Comedy' } }),
      'comedy',
    );
    assert.equal(mapTicketmasterCategory(undefined), 'other');
  });

  test('primaryClassification prefers the primary entry', () => {
    const chosen = primaryClassification([
      { primary: false, segment: { name: 'Music' } },
      { primary: true, segment: { name: 'Sports' } },
    ]);
    assert.equal(chosen?.segment?.name, 'Sports');
  });
});

describe('mapTicketmasterEvent', () => {
  test('maps a theatre event with coordinates and no price', () => {
    const event = mapTicketmasterEvent(events[0]!);
    assert.equal(event.id, 'ticketmaster:1549892649');
    assert.equal(event.category, 'theatre');
    assert.equal(event.startsAt, '2026-09-03T16:30:00.000Z');
    assert.equal(event.imageUrl, 'https://s1.ticketm.net/large.jpg');
    assert.equal(event.venue.name, 'Tyrol');
    assert.equal(event.venue.latitude, 59.324127);
    assert.equal(event.venue.longitude, 18.096259);
    assert.equal(event.priceSek, undefined);
    assert.equal(event.organizer, 'MM! The Party in Stockholm AB');
  });

  test('maps a music event and reads the SEK minimum price', () => {
    const event = mapTicketmasterEvent(events[1]!);
    assert.equal(event.category, 'music');
    assert.equal(event.priceSek, 395);
    assert.equal(event.imageUrl, 'https://s1.ticketm.net/hakan.jpg');
    assert.equal(event.startsAt, '2026-10-10T18:00:00.000Z');
  });
});

describe('TicketmasterAdapter', () => {
  const original = process.env.TICKETMASTER_API_KEY;

  beforeEach(() => {
    process.env.TICKETMASTER_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (original === undefined) delete process.env.TICKETMASTER_API_KEY;
    else process.env.TICKETMASTER_API_KEY = original;
  });

  test('drops TBD events and maps the rest', async () => {
    const mapped = await new TicketmasterAdapter().fetch({ fetchImpl: fixtureFetch() });
    assert.equal(mapped.length, 3);
    assert.ok(!mapped.some((event) => event.id === 'ticketmaster:4000333'));
    assert.ok(mapped.every((event) => event.source === 'ticketmaster'));
  });

  test('throws a clear error when the API key is missing', async () => {
    delete process.env.TICKETMASTER_API_KEY;
    await assert.rejects(
      () => new TicketmasterAdapter().fetch({ fetchImpl: fixtureFetch() }),
      /TICKETMASTER_API_KEY is not set/,
    );
  });
});
