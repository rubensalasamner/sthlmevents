import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { mapLoppisRow } from './mapper.js';
import { parseLoppiskartan } from './parse.js';
import type { LoppisRow } from './types.js';

const fixture = readFileSync(
  new URL('../../../fixtures/loppiskartan.sample.html', import.meta.url),
  'utf8',
);

describe('parseLoppiskartan', () => {
  const rows = parseLoppiskartan(fixture);

  test('parses every market anchor in the fixture', () => {
    assert.ok(rows.length >= 8, `expected >= 8 rows, got ${rows.length}`);
  });

  test('extracts date, title, times, city and region', () => {
    for (const row of rows) {
      assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/, 'date should be ISO');
      assert.ok(row.title.length > 0, 'title should be present');
      assert.ok(row.path.startsWith('/markets/'), 'path should be a market path');
      if (row.startTime) assert.match(row.startTime, /^\d{1,2}:\d{2}$/);
    }
  });

  test('captures Stockholm rows that can be filtered by region', () => {
    const stockholm = rows.filter((r) => r.region.includes('Stockholm'));
    assert.ok(stockholm.length >= 1, 'fixture should contain Stockholm rows');
    assert.ok(
      stockholm.length < rows.length,
      'fixture should also contain non-Stockholm rows to prove filtering',
    );
  });
});

describe('mapLoppisRow', () => {
  const row: LoppisRow = {
    path: '/markets/dalendagen-2026',
    date: '2026-09-05',
    title: 'Dalendagen 2026',
    startTime: '11:00',
    endTime: '15:00',
    city: 'Stockholm',
    region: 'Stockholms län',
  };

  test('maps to a market event with free entry and detail link', () => {
    const event = mapLoppisRow(row);
    assert.equal(event.id, 'loppiskartan:dalendagen-2026@2026-09-05');
    assert.equal(event.source, 'loppiskartan');
    assert.equal(event.sourceId, 'dalendagen-2026@2026-09-05');
    assert.equal(event.category, 'market');
    assert.equal(event.priceSek, 0);
    assert.equal(event.ticketUrl, 'https://loppiskartan.se/markets/dalendagen-2026');
    assert.equal(event.startsAt, '2026-09-05T09:00:00.000Z');
    assert.equal(event.endsAt, '2026-09-05T13:00:00.000Z');
    assert.equal(event.venue.district, 'Stockholm');
    assert.equal(event.venue.latitude, undefined);
  });

  test('gives recurring dates of one market distinct ids', () => {
    const a = mapLoppisRow({ ...row, date: '2026-09-05' });
    const b = mapLoppisRow({ ...row, date: '2026-09-12' });
    assert.notEqual(a.id, b.id);
  });

  test('handles a row without an end time', () => {
    const event = mapLoppisRow({ ...row, endTime: undefined });
    assert.equal(event.endsAt, undefined);
    assert.ok(!Number.isNaN(Date.parse(event.startsAt)));
  });
});
