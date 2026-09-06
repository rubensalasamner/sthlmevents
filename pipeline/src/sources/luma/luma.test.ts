import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { LumaAdapter, isMappableLumaEntry } from './adapter.js';
import { mapLumaCategory } from './category-map.js';
import { mapLumaEntry } from './mapper.js';
import { parseLumaEvents } from './parse.js';

const fixture = readFileSync(new URL('../../../fixtures/luma.sample.html', import.meta.url), 'utf8');

function fixtureFetch(): typeof fetch {
  return (async () =>
    new Response(fixture, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    })) as unknown as typeof fetch;
}

describe('parseLumaEvents', () => {
  test('reads every entry from __NEXT_DATA__', () => {
    assert.equal(parseLumaEvents(fixture).length, 4);
  });

  test('returns [] when there is no __NEXT_DATA__', () => {
    assert.deepEqual(parseLumaEvents('<html><body>nothing</body></html>'), []);
  });

  test('returns [] on malformed JSON', () => {
    assert.deepEqual(
      parseLumaEvents('<script id="__NEXT_DATA__" type="application/json">{bad</script>'),
      [],
    );
  });
});

describe('mapLumaCategory', () => {
  test('maps by keyword and falls back to other', () => {
    assert.equal(mapLumaCategory('Live Music: indie band at Nalen'), 'music');
    assert.equal(mapLumaCategory('Techno all night'), 'nightlife');
    assert.equal(mapLumaCategory('Security in the AI era'), 'other');
  });
});

describe('mapLumaEntry', () => {
  const entries = parseLumaEvents(fixture);
  const free = entries.find((e) => e.event.api_id === 'evt-free-offline')!;
  const paid = entries.find((e) => e.event.api_id === 'evt-paid-offline')!;

  test('maps a free, address-obfuscated event with coordinates', () => {
    const event = mapLumaEntry(free);
    assert.equal(event.id, 'luma:evt-free-offline');
    assert.equal(event.source, 'luma');
    assert.equal(event.startsAt, '2026-09-01T15:00:00.000Z');
    assert.equal(event.endsAt, '2026-09-01T18:30:00.000Z');
    assert.equal(event.venue.latitude, 59.336844);
    assert.equal(event.venue.longitude, 18.049578);
    assert.equal(event.venue.district, 'Stockholm');
    assert.equal(event.imageUrl, 'https://images.lumacdn.com/uploads/cover-1.png');
    assert.equal(event.priceSek, 0, 'explicit free -> 0');
    assert.equal(event.ticketUrl, 'https://lu.ma/80ewktu7');
    assert.equal(event.organizer, 'Irori');
  });

  test('leaves paid price unknown and uses the public venue name/district', () => {
    const event = mapLumaEntry(paid);
    assert.equal(event.category, 'music');
    assert.equal(event.priceSek, undefined, 'paid price is currency-ambiguous -> unknown');
    assert.equal(event.venue.name, 'Nalen');
    assert.equal(event.venue.address, 'Regeringsgatan 74');
    assert.equal(event.venue.district, 'Norrmalm');
    assert.equal(event.endsAt, undefined);
  });
});

describe('isMappableLumaEntry', () => {
  const entries = parseLumaEvents(fixture);

  test('keeps offline entries with a start time', () => {
    assert.equal(isMappableLumaEntry(entries.find((e) => e.event.api_id === 'evt-free-offline')!), true);
  });

  test('drops online entries', () => {
    assert.equal(isMappableLumaEntry(entries.find((e) => e.event.api_id === 'evt-online')!), false);
  });

  test('drops entries without a start time', () => {
    assert.equal(isMappableLumaEntry(entries.find((e) => e.event.api_id === 'evt-no-start')!), false);
  });
});

describe('LumaAdapter', () => {
  test('yields only in-person, scheduled events', async () => {
    const events = await new LumaAdapter().fetch({ fetchImpl: fixtureFetch() });
    assert.equal(events.length, 2);
    assert.ok(events.every((event) => event.venue.latitude !== undefined));
    assert.ok(!events.some((event) => event.title.includes('Online')));
  });
});
