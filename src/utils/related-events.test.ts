import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { relatedRails, sameDayNearby, sameOrganizer, sameVenue } from './related-events.js';
import type { StockholmEvent } from '@/types/event';

const SODER = { latitude: 59.3155, longitude: 18.0717 };
const NEAR_SODER = { latitude: 59.3172, longitude: 18.0735 };
const KISTA = { latitude: 59.4032, longitude: 17.9447 };

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'music',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-10-09T17:00:00.000Z',
    venue: { name: 'Nalen', address: '', district: 'Östermalm' },
    organizer: 'Nalen',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-10-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

// Wednesday 7 Oct 2026, 12:00 Stockholm (CEST).
const NOW = new Date('2026-10-07T10:00:00.000Z');

describe('relatedRails', () => {
  test('venue rail excludes the event and its own series', () => {
    const current = event({ id: 'a', title: 'Jazz night' });
    const rails = relatedRails(
      current,
      [
        current,
        event({ id: 'a2', title: 'Jazz night', startsAt: '2026-10-16T17:00:00.000Z' }),
        event({ id: 'b', title: 'Soul night' }),
      ],
      NOW,
      [sameVenue],
    );
    assert.deepEqual(rails[0]?.events.map((e) => e.id), ['b']);
    assert.equal(rails[0]?.title, 'More at Nalen');
  });

  test('organizer rail is skipped when organizer is the venue', () => {
    const current = event({ id: 'a' });
    const rails = relatedRails(current, [event({ id: 'b', title: 'Other' })], NOW, [sameOrganizer]);
    assert.deepEqual(rails, []);
  });

  test('later rails never repeat a series an earlier rail showed', () => {
    const current = event({ id: 'a', organizer: 'Live Nation' });
    const both = event({ id: 'b', title: 'Both', organizer: 'Live Nation' });
    const elsewhere = event({
      id: 'c',
      title: 'Elsewhere',
      organizer: 'Live Nation',
      venue: { name: 'Annexet', address: '', district: 'Johanneshov' },
    });
    const rails = relatedRails(current, [both, elsewhere], NOW, [sameVenue, sameOrganizer]);
    assert.deepEqual(
      rails.map((r) => [r.id, r.events.map((e) => e.id)]),
      [
        ['venue', ['b']],
        ['organizer', ['c']],
      ],
    );
  });

  test('ended events are not suggested', () => {
    const current = event({ id: 'a' });
    const ended = event({ id: 'old', title: 'Old', startsAt: '2026-10-01T17:00:00.000Z' });
    assert.deepEqual(relatedRails(current, [ended], NOW, [sameVenue]), []);
  });

  test('mixed flags rails with more than one category', () => {
    const current = event({ id: 'a' });
    const rails = relatedRails(
      current,
      [event({ id: 'b', title: 'B' }), event({ id: 'c', title: 'C', category: 'comedy' })],
      NOW,
      [sameVenue],
    );
    assert.equal(rails[0]?.mixed, true);
  });
});

describe('sameDayNearby', () => {
  const current = event({
    id: 'a',
    venue: { name: 'Here', address: '', district: 'Södermalm', ...SODER },
  });

  test('keeps same-day events within walking distance, nearest first', () => {
    const near = event({
      id: 'near',
      title: 'Near',
      venue: { name: 'Next door', address: '', district: 'Södermalm', ...NEAR_SODER },
    });
    const sameSpot = event({
      id: 'spot',
      title: 'Spot',
      venue: { name: 'Same spot', address: '', district: 'Södermalm', ...SODER },
    });
    const far = event({
      id: 'far',
      title: 'Far',
      venue: { name: 'Kista', address: '', district: 'Kista', ...KISTA },
    });
    const otherDay = event({
      id: 'later',
      title: 'Later',
      startsAt: '2026-10-10T17:00:00.000Z',
      venue: { name: 'Next door', address: '', district: 'Södermalm', ...NEAR_SODER },
    });
    const picked = sameDayNearby.pick(current, [near, sameSpot, far, otherDay], NOW);
    assert.deepEqual(picked.map((e) => e.id), ['spot', 'near']);
  });

  test('month-long runs are not same-day suggestions', () => {
    const exhibition = event({
      id: 'expo',
      title: 'Expo',
      startsAt: '2026-09-01T08:00:00.000Z',
      endsAt: '2026-12-01T16:00:00.000Z',
      venue: { name: 'Gallery', address: '', district: 'Södermalm', ...NEAR_SODER },
    });
    assert.deepEqual(sameDayNearby.pick(current, [exhibition], NOW), []);
  });

  test('events without coordinates get no nearby rail', () => {
    assert.deepEqual(sameDayNearby.pick(event({ id: 'a' }), [event({ id: 'b' })], NOW), []);
  });
});
