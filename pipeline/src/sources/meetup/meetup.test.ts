import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { MeetupAdapter, isMappableMeetupEvent } from './adapter.js';
import { mapMeetupCategory } from './category-map.js';
import { mapMeetupEvent } from './mapper.js';
import { parseMeetupEvents } from './parse.js';

const fixture = readFileSync(
  new URL('../../../fixtures/meetup.sample.html', import.meta.url),
  'utf8',
);

function fixtureFetch(): typeof fetch {
  return (async () =>
    new Response(fixture, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    })) as unknown as typeof fetch;
}

describe('parseMeetupEvents', () => {
  const events = parseMeetupEvents(fixture);

  test('merges overlapping buckets by id', () => {
    // 4 events in eventsInLocation + 1 duplicate in topicalEventsSocial.
    assert.equal(events.length, 4);
  });

  test('keeps bucket edges in both `{ node }` and flat shapes', () => {
    const mixed = parseMeetupEvents(
      '<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"eventsInLocation":{"data":[{"node":{"id":"1","title":"A"}},{"id":"2","title":"B"}]}}}}</script>',
    );
    assert.deepEqual(mixed.map((e) => e.id), ['1', '2']);
  });

  test('returns [] when there is no __NEXT_DATA__', () => {
    assert.deepEqual(parseMeetupEvents('<html><body>nothing</body></html>'), []);
  });
});

describe('mapMeetupCategory', () => {
  test('maps by keyword and falls back to other', () => {
    assert.equal(mapMeetupCategory('Salsa Night at Fashing'), 'music');
    assert.equal(mapMeetupCategory('Sunday Football'), 'sports');
    assert.equal(mapMeetupCategory('Model Optimization & CPU Based Inferencing'), 'other');
  });
});

describe('mapMeetupEvent', () => {
  const events = parseMeetupEvents(fixture);
  const mlops = events.find((e) => e.id === '316097708')!;
  const salsa = events.find((e) => e.id === '316000002')!;

  test('maps times with offsets, venue, photo, and group as organizer', () => {
    const event = mapMeetupEvent(mlops);
    assert.equal(event.id, 'meetup:316097708');
    assert.equal(event.source, 'meetup');
    assert.equal(event.sourceId, '316097708');
    // +02:00 offset converted to plain UTC.
    assert.equal(event.startsAt, '2026-09-24T15:00:00.000Z');
    assert.equal(event.endsAt, '2026-09-24T19:00:00.000Z');
    assert.equal(event.venue.name, 'AI Sweden');
    assert.equal(event.venue.address, 'Folkungagatan 44');
    assert.equal(event.venue.latitude, undefined, 'find-page venues have no geo');
    assert.equal(event.imageUrl, 'https://secure.meetupstatic.com/photos/event/2/f/8/d/highres_535872173.jpeg');
    assert.equal(event.organizer, 'Stockholm MLOps Community');
    assert.equal(event.ticketUrl, mlops.eventUrl);
    assert.equal(event.requiresAccount, true, 'RSVP needs a Meetup account');
    assert.equal(event.priceSek, undefined);
  });

  test('maps an SEK fee and falls back to displayPhoto', () => {
    const event = mapMeetupEvent(salsa);
    assert.equal(event.priceSek, 150);
    assert.equal(event.imageUrl, 'https://secure-content.meetupstatic.com/images/classic-events/1');
    assert.equal(event.endsAt, undefined);
  });
});

describe('isMappableMeetupEvent', () => {
  const events = parseMeetupEvents(fixture);

  test('keeps physical events with a start time', () => {
    assert.equal(isMappableMeetupEvent(events.find((e) => e.id === '316097708')!), true);
  });

  test('drops online events', () => {
    assert.equal(isMappableMeetupEvent(events.find((e) => e.id === '316000003')!), false);
  });

  test('drops events without a start time', () => {
    assert.equal(isMappableMeetupEvent(events.find((e) => e.id === '316000004')!), false);
  });
});

describe('MeetupAdapter', () => {
  test('yields only physical, scheduled events', async () => {
    const events = await new MeetupAdapter().fetch({ fetchImpl: fixtureFetch() });
    assert.equal(events.length, 2);
    assert.ok(events.every((event) => event.source === 'meetup'));
    assert.ok(!events.some((event) => event.title.includes('Online') || event.title.includes('Unscheduled')));
  });
});
