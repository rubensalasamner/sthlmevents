import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { ResidentAdvisorAdapter } from './adapter.js';
import { mapRaEvent, parseRaCost, raLocalToUtc } from './mapper.js';
import { buildVariables, listingWindow } from './query.js';
import type { RaEvent, RaEventListingsResponse } from './types.js';

const fixture = JSON.parse(
  readFileSync(new URL('../../../fixtures/resident-advisor.sample.json', import.meta.url), 'utf8'),
) as RaEventListingsResponse;

const events = fixture.data!.eventListings!.data.map((item) => item.event as RaEvent);

function fixtureFetch(): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(fixture), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;
}

describe('raLocalToUtc', () => {
  test('treats LocalDateTime as Stockholm wall-clock (CEST = +02:00)', () => {
    assert.equal(raLocalToUtc('2026-09-02T17:00:00.000'), '2026-09-02T15:00:00.000Z');
  });

  test('handles a cross-midnight end time', () => {
    assert.equal(raLocalToUtc('2026-09-03T00:00:00.000'), '2026-09-02T22:00:00.000Z');
  });

  test('returns undefined for null', () => {
    assert.equal(raLocalToUtc(null), undefined);
  });
});

describe('parseRaCost', () => {
  test('maps only unambiguous free entry to a price', () => {
    assert.equal(parseRaCost('0'), 0);
    assert.equal(parseRaCost('Free'), 0);
    assert.equal(parseRaCost('25 '), undefined);
    assert.equal(parseRaCost(null), undefined);
  });
});

describe('listingWindow / buildVariables', () => {
  test('builds a Stockholm-local date window and area filter', () => {
    const window = listingWindow(new Date('2026-09-01T10:00:00Z'), 90);
    assert.equal(window.gte, '2026-09-01');
    assert.equal(window.lte, '2026-11-30');

    const variables = buildVariables(396, window, 50, 2);
    assert.deepEqual(variables, {
      filters: { areas: { eq: 396 }, listingDate: { gte: '2026-09-01', lte: '2026-11-30' } },
      pageSize: 50,
      page: 2,
    });
  });
});

describe('mapRaEvent', () => {
  test('maps a free event with inline venue coordinates', () => {
    const event = mapRaEvent(events[0]!);
    assert.equal(event.id, 'resident-advisor:2506426');
    assert.equal(event.category, 'nightlife');
    assert.equal(event.priceSek, 0);
    assert.equal(event.startsAt, '2026-09-02T15:00:00.000Z');
    assert.equal(event.endsAt, '2026-09-02T22:00:00.000Z');
    assert.equal(event.venue.name, 'Slakthuset');
    assert.equal(event.venue.latitude, 59.291777);
    assert.equal(event.venue.longitude, 18.079366);
    assert.equal(event.organizer, 'Black Planet (Berlin)');
    assert.equal(event.ticketUrl, 'https://ra.co/events/2506426');
    assert.equal(event.updatedAt, '2026-08-05T20:04:46.507Z');
  });

  test('leaves ambiguous cost unknown and falls back to genres/lineup for empty copy', () => {
    const event = mapRaEvent(events[1]!);
    assert.equal(event.priceSek, undefined);
    assert.equal(event.imageUrl, 'https://images.ra.co/flyer.jpg');
    assert.equal(event.description, 'Genres: Techno, House · Lineup: Luigi Tozzi, Claudio PRC');
  });
});

describe('ResidentAdvisorAdapter', () => {
  test('drops events without a start and maps the rest in one page', async () => {
    const mapped = await new ResidentAdvisorAdapter().fetch({ fetchImpl: fixtureFetch() });
    assert.equal(mapped.length, 2);
    assert.ok(!mapped.some((event) => event.id === 'resident-advisor:9999001'));
    assert.ok(mapped.every((event) => event.source === 'resident-advisor'));
  });
});
