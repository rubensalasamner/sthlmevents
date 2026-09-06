import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { BiblioteketAdapter } from './adapter.js';
import { mapBibCategory } from './category-map.js';
import { mapBibEvent, parseBibDate } from './mapper.js';
import type { BibEvent, BibResponse } from './types.js';

function bibEvent(overrides: Partial<BibEvent> = {}): BibEvent {
  return {
    id: 12345,
    title: 'Sagostund för barn',
    eventSlugId: 'sagostund-for-barn-12',
    description: { preamble: 'Vi läser högt ur barnens egna favoritböcker.' },
    image: { url: 'https://biblioteket.stockholm.se/cdn/strapi/large_saga.jpg' },
    location: 'Södermalm',
    library: 'Hornstulls bibliotek',
    externalEventLink: '',
    dateTime: {
      startDate: 'torsdag 10 september 2026',
      stopDate: 'torsdag 10 september 2026',
      startTime: '10:30',
      stopTime: '11:15',
    },
    targetAudiences: ['Barn'],
    ...overrides,
  };
}

function gqlResponse(events: BibEvent[]): typeof fetch {
  const payload: BibResponse = {
    data: { eventSearch: { results: events.length, events } },
  };
  return (async () => new Response(JSON.stringify(payload), { status: 200 })) as unknown as typeof fetch;
}

describe('parseBibDate', () => {
  test('parses Swedish long-form dates', () => {
    assert.equal(parseBibDate('onsdag 2 september 2026'), '2026-09-02');
    assert.equal(parseBibDate('lördag 12 september 2026'), '2026-09-12');
    assert.equal(parseBibDate('1 januari 2027'), '2027-01-01');
    assert.equal(parseBibDate('okänt format'), null);
  });
});

describe('mapBibCategory', () => {
  test('maps Swedish keywords and falls back to other', () => {
    assert.equal(mapBibCategory('Konsert: Jazz på trappen', ''), 'music');
    assert.equal(mapBibCategory('Sagostund', 'Vi läser för barnen'), 'family');
    assert.equal(mapBibCategory('Vernissage', 'Ny utställning öppnar'), 'art');
    assert.equal(mapBibCategory('Föreläsning om AI', ''), 'other');
  });
});

describe('mapBibEvent', () => {
  test('maps identity, venue, times, image and free price', () => {
    const event = mapBibEvent(bibEvent());
    assert.ok(event);
    assert.equal(event!.id, 'biblioteket:12345');
    assert.equal(event!.source, 'biblioteket');
    assert.equal(event!.sourceId, '12345');
    assert.equal(event!.title, 'Sagostund för barn');
    // 10:30 Stockholm (CEST, UTC+2) in September
    assert.equal(event!.startsAt, '2026-09-10T08:30:00.000Z');
    assert.equal(event!.endsAt, '2026-09-10T09:15:00.000Z');
    assert.equal(event!.venue.name, 'Hornstulls bibliotek');
    assert.equal(event!.venue.address, 'Södermalm');
    assert.equal(event!.priceSek, 0);
    assert.equal(event!.imageUrl, 'https://biblioteket.stockholm.se/cdn/strapi/large_saga.jpg');
    assert.equal(event!.sourceUrl, 'https://biblioteket.stockholm.se/evenemang/sagostund-for-barn-12');
    assert.equal(event!.organizer, 'Stockholms stadsbibliotek');
  });

  test('treats multi-day events as ongoing until stop day 23:59 local', () => {
    const event = mapBibEvent(
      bibEvent({
        title: 'Läsutmaning: 30 dagar',
        dateTime: {
          startDate: 'måndag 1 september 2026',
          stopDate: 'onsdag 30 september 2026',
          startTime: '00:00',
          stopTime: '23:59',
        },
      }),
    );
    assert.equal(event!.startsAt, '2026-08-31T22:00:00.000Z');
    assert.equal(event!.endsAt, '2026-09-30T21:59:00.000Z');
  });

  test('all-day single-day event ends at local 23:59', () => {
    const event = mapBibEvent(
      bibEvent({ dateTime: { startDate: 'lördag 12 september 2026', stopDate: 'lördag 12 september 2026' } }),
    );
    assert.equal(event!.startsAt, '2026-09-11T22:00:00.000Z');
    assert.equal(event!.endsAt, '2026-09-12T21:59:00.000Z');
  });

  test('returns null when the start date is unparsable', () => {
    assert.equal(mapBibEvent(bibEvent({ dateTime: { startDate: '??', stopDate: '??' } })), null);
  });

  test('falls back to category image when the API image is missing', () => {
    const event = mapBibEvent(bibEvent({ image: { url: '' } }));
    assert.match(event!.imageUrl, /unsplash/);
  });
});

describe('BiblioteketAdapter', () => {
  test('searches the upcoming window, pages until short page, maps events', async () => {
    const calls: BibSearchVars[] = [];
    let page = 0;
    const pagingFetch = (async (_url: unknown, init?: { body?: string }) => {
      const vars = JSON.parse(init?.body ?? '{}').variables;
      calls.push(vars);
      page += 1;
      // First page: full (triggers a second call). Second page: short (stops).
      const events =
        page === 1
          ? Array.from({ length: 500 }, (_, i) => bibEvent({ id: i + 1 }))
          : [bibEvent({ id: 501 })];
      return new Response(JSON.stringify({ data: { eventSearch: { results: 501, events } } }), { status: 200 });
    }) as unknown as typeof fetch;

    const events = await new BiblioteketAdapter().fetch({ fetchImpl: pagingFetch });

    assert.equal(calls.length, 2);
    assert.equal(calls[0]!.query, '');
    assert.equal(calls[0]!.isSchoolEvent, false);
    assert.ok(calls[0]!.startDate, 'window start is set');
    assert.ok(calls[0]!.stopDate, 'window stop is set');
    assert.equal(calls[1]!.from, 500);
    assert.equal(events.length, 501);
    assert.equal(events.at(-1)!.sourceId, '501');
  });

  test('raises on GraphQL errors', async () => {
    const failing = (async () =>
      new Response(JSON.stringify({ errors: [{ message: 'boom' }] }), { status: 200 })) as unknown as typeof fetch;
    await assert.rejects(() => new BiblioteketAdapter().fetch({ fetchImpl: failing }), /boom/);
  });

  test('raises on HTTP failure', async () => {
    const failing = (async () => new Response('nope', { status: 503 })) as unknown as typeof fetch;
    await assert.rejects(() => new BiblioteketAdapter().fetch({ fetchImpl: failing }), /503/);
  });
});

type BibSearchVars = {
  query: string;
  size: number;
  from: number;
  startDate?: string;
  stopDate?: string;
  isSchoolEvent: boolean;
};
