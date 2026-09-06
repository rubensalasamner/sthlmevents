import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { KulturhusetAdapter } from './adapter.js';
import { mapKhsCategory } from './category-map.js';
import { mapKhsEvent } from './mapper.js';
import type { KhsEventSource, KhsSearchResponse } from './types.js';

function khsEvent(overrides: Partial<KhsEventSource> = {}): KhsEventSource {
  return {
    drupalId: 5091,
    drupalTitle: 'Al Pitcher testar nya skämt',
    drupalLink: 'https://kulturhusetstadsteatern.se/stand/al-pitcher-testar-nya-skamt',
    hidePriceInfo: false,
    drupalCategory: [{ id: '161', label: 'Standup' }],
    drupalHeroImage: [{ id: 13845, src: 'https://kulturhusetstadsteatern.se/sites/default/files/2026-08/al.jpg' }],
    drupalLeadText: [{ value: 'Jag jobbar just nu på en helt ny standup-show.' }],
    drupalLocation: [{ id: '13', label: 'Sergels torg' }],
    tixEventId: 121606,
    tixEventGroupId: 27637,
    tixName: 'Al Pitcher testar nya skämt',
    tixStartDate: '2026-09-15T19:30:00+02:00',
    tixEndDate: '2026-09-15T20:30:00+02:00',
    tixMinPrice: 275,
    tixMaxPrice: 275,
    tixTicketLink: 'https://tix.kulturhusetstadsteatern.se/sv/buyingflow/tickets/27637/121606/',
    tixSaleStatusId: 2,
    tixHall: [{ id: 520, label: 'Hörsalen' }],
    tixVenue: [{ id: 205, label: 'Sergels torg' }],
    ...overrides,
  };
}

function esResponse(events: KhsEventSource[]): typeof fetch {
  const payload: KhsSearchResponse = {
    hits: { total: { value: events.length, relation: 'eq' }, hits: events.map((_source, i) => ({ _id: String(i), _source })) },
  };
  return (async () => new Response(JSON.stringify(payload), { status: 200 })) as unknown as typeof fetch;
}

describe('mapKhsCategory', () => {
  test('maps taxonomy labels first, then keywords, then other', () => {
    assert.equal(mapKhsCategory(['Standup'], 'x', ''), 'comedy');
    assert.equal(mapKhsCategory(['Konsert'], 'x', ''), 'music');
    assert.equal(mapKhsCategory(['Teater för barn'], 'x', ''), 'theatre');
    assert.equal(mapKhsCategory([], 'Sagostund på Lava', ''), 'family');
    assert.equal(mapKhsCategory([], 'Något helt annat', ''), 'other');
  });
});

describe('mapKhsEvent', () => {
  test('maps identity, venue, times, price and ticket link', () => {
    const event = mapKhsEvent(khsEvent());
    assert.equal(event.id, 'kulturhuset:121606');
    assert.equal(event.source, 'kulturhuset');
    assert.equal(event.sourceId, '121606');
    assert.equal(event.title, 'Al Pitcher testar nya skämt');
    // Offset-aware: 19:30 +02:00 -> 17:30Z
    assert.equal(event.startsAt, '2026-09-15T17:30:00.000Z');
    assert.equal(event.endsAt, '2026-09-15T18:30:00.000Z');
    assert.equal(event.venue.name, 'Sergels torg');
    assert.equal(event.priceSek, 275);
    assert.equal(event.category, 'comedy');
    assert.equal(event.ticketUrl, 'https://tix.kulturhusetstadsteatern.se/sv/buyingflow/tickets/27637/121606/');
    assert.equal(event.sourceUrl, 'https://kulturhusetstadsteatern.se/stand/al-pitcher-testar-nya-skamt');
    assert.equal(event.organizer, 'Kulturhuset Stadsteatern');
    assert.match(event.imageUrl!, /al\.jpg$/);
  });

  test('free events get priceSek 0, hidden prices stay unknown', () => {
    assert.equal(mapKhsEvent(khsEvent({ tixMinPrice: 0, tixMaxPrice: 0 })).priceSek, 0);
    assert.equal(mapKhsEvent(khsEvent({ hidePriceInfo: true })).priceSek, undefined);
    assert.equal(mapKhsEvent(khsEvent({ tixMinPrice: null, tixMaxPrice: null })).priceSek, undefined);
  });

  test('falls back to tix fields when drupal content is missing', () => {
    const event = mapKhsEvent(
      khsEvent({ drupalTitle: '', drupalLeadText: [], drupalHeroImage: [], drupalLocation: [], drupalLink: '' }),
    );
    assert.equal(event.title, 'Al Pitcher testar nya skämt');
    assert.equal(event.venue.name, 'Sergels torg');
    assert.equal(event.description, '');
    assert.match(event.imageUrl, /unsplash/);
    assert.equal(event.sourceUrl, undefined);
  });

  test('drops the sale-status field without dropping the event', () => {
    const event = mapKhsEvent(khsEvent({ tixSaleStatusId: 7 }));
    assert.equal(event.id, 'kulturhuset:121606');
  });
});

describe('KulturhusetAdapter', () => {
  test('pages until a short page and maps events', async () => {
    const bodies: string[] = [];
    let page = 0;
    const pagingFetch = (async (_url: unknown, init?: { body?: string }) => {
      bodies.push(init?.body ?? '');
      page += 1;
      const events =
        page === 1 ? Array.from({ length: 500 }, (_, i) => khsEvent({ tixEventId: i + 1 })) : [khsEvent({ tixEventId: 501 })];
      return new Response(JSON.stringify({ hits: { total: { value: 501, relation: 'eq' }, hits: events.map((_source, i) => ({ _id: String(i), _source })) } }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    const events = await new KulturhusetAdapter().fetch({ fetchImpl: pagingFetch });

    assert.equal(bodies.length, 2);
    const firstQuery = JSON.parse(bodies[0]!);
    assert.ok(firstQuery.query.range.tixStartDate.gte);
    assert.equal(firstQuery.sort.tixStartDate, 'asc');
    const secondQuery = JSON.parse(bodies[1]!);
    assert.equal(secondQuery.from, 500);
    assert.equal(events.length, 501);
    assert.equal(events.at(-1)!.sourceId, '501');
  });

  test('raises on HTTP failure', async () => {
    const failing = (async () => new Response('nope', { status: 503 })) as unknown as typeof fetch;
    await assert.rejects(() => new KulturhusetAdapter().fetch({ fetchImpl: failing }), /503/);
  });
});
