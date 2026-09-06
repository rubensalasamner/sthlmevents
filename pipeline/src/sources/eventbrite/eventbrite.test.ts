import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { EventbriteAdapter, isInPersonEvent } from './adapter.js';
import { mapEventbriteCategory } from './category-map.js';
import { mapEventbriteEvent } from './mapper.js';
import { eventbriteIdFromUrl, parseEventbriteEvents } from './parse.js';

const fixture = readFileSync(
  new URL('../../../fixtures/eventbrite.sample.html', import.meta.url),
  'utf8',
);

function fixtureFetch(): typeof fetch {
  return (async () =>
    new Response(fixture, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    })) as unknown as typeof fetch;
}

describe('parseEventbriteEvents', () => {
  const events = parseEventbriteEvents(fixture);

  test('reads every Event from the ItemList JSON-LD', () => {
    assert.equal(events.length, 3);
    assert.ok(events.every((event) => event['@type'] === 'Event'));
  });

  test('returns [] when there is no JSON-LD list', () => {
    assert.deepEqual(parseEventbriteEvents('<html><body>no ld</body></html>'), []);
  });
});

describe('eventbriteIdFromUrl', () => {
  test('extracts the numeric id from a tickets URL', () => {
    assert.equal(
      eventbriteIdFromUrl('https://www.eventbrite.com/e/retail-hub-breakfast-tickets-1997672871334'),
      '1997672871334',
    );
  });

  test('returns null when no id is present', () => {
    assert.equal(eventbriteIdFromUrl('https://www.eventbrite.com/d/sweden--stockholm/events/'), null);
  });
});

describe('mapEventbriteCategory', () => {
  test('maps by keyword and falls back to other', () => {
    assert.equal(mapEventbriteCategory('Techno Night with guest DJ'), 'nightlife');
    assert.equal(mapEventbriteCategory('Live Music: indie band'), 'music');
    assert.equal(mapEventbriteCategory('Vernissage & konst'), 'art');
    assert.equal(mapEventbriteCategory('Retail Hub Breakfast'), 'other');
  });
});

describe('mapEventbriteEvent', () => {
  const [breakfast, techno] = parseEventbriteEvents(fixture);

  test('maps a single-day in-person event with coordinates', () => {
    const event = mapEventbriteEvent(breakfast!);
    assert.equal(event.id, 'eventbrite:1997672871334');
    assert.equal(event.source, 'eventbrite');
    assert.equal(event.sourceId, '1997672871334');
    assert.equal(event.venue.district, 'Södermalm');
    assert.equal(event.venue.address, '22A Sankt Paulsgatan');
    assert.equal(event.venue.latitude, 59.3179398);
    assert.equal(event.venue.longitude, 18.0650409);
    // 2026-09-02 is CEST (+02:00): local midnight -> 22:00 UTC the day before.
    assert.equal(event.startsAt, '2026-09-01T22:00:00.000Z');
    assert.equal(event.endsAt, undefined);
    assert.equal(event.priceSek, undefined);
    assert.equal(event.ticketUrl, breakfast!.url);
  });

  test('maps a multi-day event with an end at local 23:59', () => {
    const event = mapEventbriteEvent(techno!);
    assert.equal(event.category, 'nightlife');
    assert.equal(event.startsAt, '2026-09-15T22:00:00.000Z');
    assert.equal(event.endsAt, '2026-09-18T21:59:00.000Z');
  });
});

describe('EventbriteAdapter', () => {
  test('drops online events and maps only in-person ones', async () => {
    const events = await new EventbriteAdapter().fetch({ fetchImpl: fixtureFetch() });
    assert.equal(events.length, 2);
    assert.ok(events.every((event) => event.venue.latitude !== undefined));
    assert.ok(!events.some((event) => event.title.includes('Online')));
  });

  test('isInPersonEvent excludes the online attendance mode', () => {
    const online = parseEventbriteEvents(fixture).find((event) => event.name.includes('Online'));
    assert.ok(online);
    assert.equal(isInPersonEvent(online!), false);
  });
});
