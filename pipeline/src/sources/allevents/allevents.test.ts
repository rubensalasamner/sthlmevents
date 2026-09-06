import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { AlleventsAdapter, isMappableAlleventsEvent } from './adapter.js';
import { mapAlleventsCategory } from './category-map.js';
import { mapAlleventsEvent, epochToIso } from './mapper.js';
import { parseAlleventsEvents } from './parse.js';

const fixture = readFileSync(
  new URL('../../../fixtures/allevents.sample.html', import.meta.url),
  'utf8',
);

function fixtureFetch(): typeof fetch {
  return (async () =>
    new Response(fixture, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    })) as unknown as typeof fetch;
}

describe('parseAlleventsEvents', () => {
  test('reads the populated events_data array, skipping empty defaults', () => {
    const events = parseAlleventsEvents(fixture);
    assert.equal(events.length, 4);
    assert.equal(events[0]!.event_id, '200028225851932');
  });

  test('handles brackets and quotes inside descriptions', () => {
    const events = parseAlleventsEvents(fixture);
    assert.match(events[0]!.short_description!, /\[and more dogs\]/);
  });

  test('returns [] when there is no events_data', () => {
    assert.deepEqual(parseAlleventsEvents('<html><body>nothing</body></html>'), []);
  });

  test('returns [] on an unbalanced array', () => {
    assert.deepEqual(
      parseAlleventsEvents('<script>_this.events_data = [{"event_id": "1"</script>'),
      [],
    );
  });
});

describe('epochToIso', () => {
  test('converts epoch seconds to UTC ISO', () => {
    assert.equal(epochToIso('1788505200'), '2026-09-04T07:00:00.000Z');
  });

  test('rejects zero/absent/garbage', () => {
    assert.equal(epochToIso('0'), undefined);
    assert.equal(epochToIso(undefined), undefined);
    assert.equal(epochToIso('soon'), undefined);
  });
});

describe('mapAlleventsCategory', () => {
  test('specific tags beat the generic entertainment slug', () => {
    const raw = { eventname: 'X', categories: ['entertainment', 'concerts'] } as never;
    assert.equal(mapAlleventsCategory(raw), 'music');
  });

  test('falls back to other for unmatched slugs', () => {
    const raw = { eventname: 'Föreläsning', categories: ['nonprofit'] } as never;
    assert.equal(mapAlleventsCategory(raw), 'other');
  });
});

describe('mapAlleventsEvent', () => {
  const [dogShow, techno, comedy] = parseAlleventsEvents(fixture);

  test('maps times, venue coordinates, image and organizer', () => {
    const event = mapAlleventsEvent(dogShow!);
    assert.equal(event.id, 'allevents:200028225851932');
    assert.equal(event.source, 'allevents');
    assert.equal(event.sourceId, '200028225851932');
    assert.equal(event.startsAt, '2026-09-04T07:00:00.000Z');
    assert.equal(event.endsAt, '2026-09-06T19:00:00.000Z');
    assert.equal(event.venue.name, 'Stockholmsmassan');
    assert.equal(event.venue.address, 'Massvagen 1,Stockholm, Sweden');
    assert.equal(event.venue.latitude, 59.278419);
    assert.equal(event.venue.longitude, 18.015871);
    assert.equal(event.imageUrl, 'https://cdn-ip.allevents.in/s/rs:fill:500:250/banner-1');
    assert.equal(event.organizer, 'WDS Helsinki');
    assert.equal(event.priceSek, undefined);
    assert.equal(event.ticketUrl, dogShow!.event_url);
    assert.equal(event.sourceUrl, dogShow!.event_url);
  });

  test('prefers an explicit ticket URL and tolerates missing end time', () => {
    const event = mapAlleventsEvent(techno!);
    assert.equal(event.ticketUrl, 'https://allevents.in/tickets/210044455566');
    assert.equal(event.endsAt, undefined);
    assert.equal(event.category, 'nightlife');
    assert.equal(event.venue.latitude, 59.3123);
  });

  test('falls back to the event-page image when no banner exists', () => {
    const event = mapAlleventsEvent(comedy!);
    assert.equal(event.category, 'comedy');
    assert.equal(event.imageUrl, 'https://cdn-az.allevents.in/events3/b3-rimg-w300-h300-gmir?v=');
    assert.equal(event.venue.latitude, undefined, 'empty-string coords stay undefined');
  });
});

describe('isMappableAlleventsEvent', () => {
  const events = parseAlleventsEvents(fixture);

  test('keeps entries with id, name and a resolvable start time', () => {
    assert.equal(isMappableAlleventsEvent(events.find((e) => e.event_id === '200028225851932')!), true);
  });

  test('drops entries without a start time', () => {
    assert.equal(isMappableAlleventsEvent(events.find((e) => e.event_id === '210066677788')!), false);
  });
});

describe('AlleventsAdapter', () => {
  test('yields only entries with a resolvable start time', async () => {
    const events = await new AlleventsAdapter().fetch({ fetchImpl: fixtureFetch() });
    assert.equal(events.length, 3);
    assert.ok(events.every((event) => event.source === 'allevents'));
    assert.ok(!events.some((event) => event.title.includes('Draft')));
  });
});
