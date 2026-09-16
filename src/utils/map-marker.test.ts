import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import {
  formatMapBubbleLabel,
  mapBubbleContent,
  mapBubbleSizeTier,
  MAP_TITLE_MAX_EVENTS,
  MAP_TITLE_ZOOM,
  mappableEvents,
  shouldShowMapTitles,
  truncateMapTitle,
} from '@/utils/map-marker';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'music',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-16T17:00:00.000Z',
    venue: { name: 'v', address: '', district: 'd', latitude: 59.33, longitude: 18.07 },
    organizer: 'o',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

const NOW = new Date('2026-09-16T12:00:00.000Z');

describe('mappableEvents', () => {
  test('keeps only events with both coordinates', () => {
    const withCoords = event({ id: 'a' });
    const missingLng = event({
      id: 'b',
      venue: { name: 'v', address: '', district: 'd', latitude: 59.33 },
    });
    const missingBoth = event({
      id: 'c',
      venue: { name: 'v', address: '', district: 'd' },
    });
    assert.deepEqual(
      mappableEvents([withCoords, missingLng, missingBoth]).map((e) => e.id),
      ['a'],
    );
  });
});

describe('mapBubbleContent', () => {
  test('time mode is primary only', () => {
    assert.deepEqual(
      mapBubbleContent(event({ startsAt: '2026-09-16T17:00:00.000Z' }), { now: NOW }),
      { primary: '19:00' },
    );
  });

  test('title mode keeps time on the secondary row', () => {
    assert.deepEqual(
      mapBubbleContent(
        event({
          title: 'A very long jazz night at Fasching with guests',
          startsAt: '2026-09-16T17:00:00.000Z',
        }),
        { showTitle: true, now: NOW },
      ),
      { primary: 'A very long jazz…', secondary: '19:00' },
    );
  });

  test('ongoing title mode shows Nu on the secondary row', () => {
    assert.deepEqual(
      mapBubbleContent(
        event({
          title: 'Exhibition',
          startsAt: '2026-09-10T10:00:00.000Z',
          endsAt: '2026-09-20T18:00:00.000Z',
        }),
        { showTitle: true, now: NOW },
      ),
      { primary: 'Exhibition', secondary: 'Nu' },
    );
  });
});

describe('formatMapBubbleLabel', () => {
  test('returns the primary line', () => {
    assert.equal(
      formatMapBubbleLabel(event({ startsAt: '2026-09-16T17:00:00.000Z' }), { now: NOW }),
      '19:00',
    );
  });
});

describe('shouldShowMapTitles', () => {
  test('unlocks for sparse results even when zoomed out', () => {
    assert.equal(shouldShowMapTitles(MAP_TITLE_MAX_EVENTS, 11), true);
    assert.equal(shouldShowMapTitles(MAP_TITLE_MAX_EVENTS + 1, 11), false);
  });

  test('unlocks when zoom crosses the neighbourhood threshold', () => {
    assert.equal(shouldShowMapTitles(100, MAP_TITLE_ZOOM - 0.1), false);
    assert.equal(shouldShowMapTitles(100, MAP_TITLE_ZOOM), true);
  });
});

describe('mapBubbleSizeTier', () => {
  test('steps sm → md → lg with zoom', () => {
    assert.equal(mapBubbleSizeTier(11), 'sm');
    assert.equal(mapBubbleSizeTier(MAP_TITLE_ZOOM), 'md');
    assert.equal(mapBubbleSizeTier(16), 'lg');
  });
});

describe('truncateMapTitle', () => {
  test('leaves short titles alone', () => {
    assert.equal(truncateMapTitle('Jazz night'), 'Jazz night');
  });
});
