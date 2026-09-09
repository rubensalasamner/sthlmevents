import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import { collapseSeries, titleVenueKey } from './collapse-series.js';

const NOW = new Date('2026-09-08T12:00:00Z');

let sequence = 0;
function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  sequence += 1;
  return {
    id: `id-${sequence}`,
    title: 'Exhibition',
    description: '',
    category: 'art',
    imageUrl: '',
    startsAt: '2026-09-10T10:00:00Z',
    venue: { name: 'Kulturhuset', address: '', district: '' },
    organizer: '',
    source: 'kulturhuset',
    sourceId: `src-${sequence}`,
    updatedAt: '2026-09-01T00:00:00Z',
    isFeatured: false,
    qualityScore: 0,
    ...overrides,
  };
}

describe('titleVenueKey', () => {
  test('folds case, diacritics and punctuation', () => {
    const a = event({ title: 'Rum för minnen', venue: { name: 'Sergels torg', address: '', district: '' } });
    const b = event({ title: 'rum för MINNEN!', venue: { name: 'sergels  TORG', address: '', district: '' } });
    assert.equal(titleVenueKey(a), titleVenueKey(b));
  });

  test('same title at different venues stays separate', () => {
    const a = event({ title: 'Same', venue: { name: 'A', address: '', district: '' } });
    const b = event({ title: 'Same', venue: { name: 'B', address: '', district: '' } });
    assert.notEqual(titleVenueKey(a), titleVenueKey(b));
  });
});

describe('collapseSeries', () => {
  test('keeps single events untouched', () => {
    const single = event();
    const result = collapseSeries([single], { now: NOW });
    assert.deepEqual(result.events, [single]);
    assert.equal(result.hiddenOccurrences, 0);
  });

  test('collapses a recurring series to its earliest upcoming occurrence', () => {
    const past = event({ startsAt: '2026-09-01T10:00:00Z' });
    const next = event({ startsAt: '2026-09-20T10:00:00Z' });
    const later = event({ startsAt: '2026-10-05T10:00:00Z' });

    const result = collapseSeries([later, past, next], { now: NOW });

    assert.equal(result.events.length, 1);
    assert.equal(result.events[0]!.id, next.id);
    assert.deepEqual(result.events[0]!.nextDates, [later.startsAt]);
    assert.equal(result.hiddenOccurrences, 2);
  });

  test('a running occurrence (endsAt covering now) represents the series', () => {
    const running = event({
      startsAt: '2026-09-01T10:00:00Z',
      endsAt: '2026-12-31T18:00:00Z',
    });
    const upcoming = event({ startsAt: '2026-09-20T10:00:00Z' });

    const result = collapseSeries([upcoming, running], { now: NOW });

    assert.equal(result.events[0]!.id, running.id);
    assert.deepEqual(result.events[0]!.nextDates, [upcoming.startsAt]);
  });

  test('series where every occurrence has passed keeps the most recent', () => {
    const old = event({ startsAt: '2026-08-01T10:00:00Z' });
    const last = event({ startsAt: '2026-08-20T10:00:00Z' });

    const result = collapseSeries([old, last], { now: NOW });

    assert.equal(result.events.length, 1);
    assert.equal(result.events[0]!.id, last.id);
    assert.equal(result.events[0]!.nextDates, undefined);
  });

  test('same title at different venues is not collapsed', () => {
    const a = event({ title: 'Same', venue: { name: 'A', address: '', district: '' } });
    const b = event({ title: 'Same', venue: { name: 'B', address: '', district: '' } });

    const result = collapseSeries([a, b], { now: NOW });

    assert.deepEqual(result.events, [a, b]);
    assert.equal(result.hiddenOccurrences, 0);
  });

  test('grouping strategy is injectable', () => {
    const a = event({ title: 'One', organizer: 'X' });
    const b = event({ title: 'Two', organizer: 'X' });
    const byOrganizer = (e: StockholmEvent) => e.organizer;

    const result = collapseSeries([a, b], { now: NOW, keyFn: byOrganizer });

    assert.equal(result.events.length, 1);
    assert.equal(result.hiddenOccurrences, 1);
  });

  test('representative is deterministic for identical start times', () => {
    const a = event({ id: 'b', startsAt: '2026-09-10T10:00:00Z' });
    const b = event({ id: 'a', startsAt: '2026-09-10T10:00:00Z' });

    const first = collapseSeries([a, b], { now: NOW });
    const second = collapseSeries([b, a], { now: NOW });

    assert.equal(first.events[0]!.id, second.events[0]!.id);
  });
});
