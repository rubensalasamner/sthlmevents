import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calendarEndDate,
  calendarLocation,
  calendarNotes,
  googleCalendarUrl,
} from './calendar-fields.js';
import type { StockholmEvent } from '../types/event.js';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'test:1',
    title: 'Sample Sale',
    description: 'Up to 70% off',
    category: 'popup',
    imageUrl: 'https://example.com/x.jpg',
    startsAt: '2026-09-25T08:00:00.000Z',
    endsAt: '2026-09-25T16:00:00.000Z',
    venue: { name: 'A-HOUSE', address: 'Uggleviksgatan 2A', district: 'Östermalm' },
    organizer: 'Brand',
    source: 'apify-facebook',
    sourceId: '1',
    sourceUrl: 'https://facebook.com/events/1',
    ticketUrl: 'https://tickets.example/1',
    updatedAt: '2026-09-16T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

test('calendarEndDate: uses endsAt when present and after start', () => {
  assert.equal(calendarEndDate(event()).toISOString(), '2026-09-25T16:00:00.000Z');
});

test('calendarEndDate: defaults to +2h when endsAt missing', () => {
  assert.equal(
    calendarEndDate(event({ endsAt: undefined })).toISOString(),
    '2026-09-25T10:00:00.000Z',
  );
});

test('calendarEndDate: defaults to +2h when endsAt is before start', () => {
  assert.equal(
    calendarEndDate(event({ endsAt: '2026-09-25T07:00:00.000Z' })).toISOString(),
    '2026-09-25T10:00:00.000Z',
  );
});

test('calendarLocation: joins venue parts', () => {
  assert.equal(calendarLocation(event()), 'A-HOUSE, Uggleviksgatan 2A, Östermalm');
});

test('calendarNotes: description + ticket url', () => {
  assert.match(calendarNotes(event()), /Up to 70% off/);
  assert.match(calendarNotes(event()), /tickets\.example/);
});

test('googleCalendarUrl: encodes title and Stockholm tz', () => {
  const url = googleCalendarUrl(event());
  assert.match(url, /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  assert.match(url, /text=Sample\+Sale|text=Sample%20Sale/);
  assert.match(url, /ctz=Europe%2FStockholm/);
  assert.match(url, /dates=20260925T080000Z%2F20260925T160000Z/);
});
