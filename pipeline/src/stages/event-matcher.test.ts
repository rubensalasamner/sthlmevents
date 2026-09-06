import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '../shared/event.js';
import { sameEvent, titleSimilarity } from './event-matcher.js';

function event(overrides: Partial<StockholmEvent>): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-05T09:00:00.000Z',
    venue: { name: 'Venue', address: '', district: 'd' },
    organizer: 'o',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

describe('titleSimilarity', () => {
  test('is 1 for equal normalized titles', () => {
    assert.equal(titleSimilarity('Håkan Hellström', 'HÅKAN  hellström'), 1);
  });

  test('is high when one title contains the other', () => {
    assert.equal(titleSimilarity('Håkan Hellström', 'Håkan Hellström – Live på Avicii Arena'), 0.95);
  });

  test('is low for unrelated titles', () => {
    assert.ok(titleSimilarity('Jazz Night', 'Flea Market') < 0.55);
  });
});

describe('sameEvent', () => {
  test('merges a distinctive contained title regardless of venue', () => {
    const a = event({ title: 'Håkan Hellström', venue: { name: 'Avicii Arena', address: '', district: 'd' } });
    const b = event({ title: 'Håkan Hellström / Stockholm', venue: { name: 'Globen', address: '', district: 'd' } });
    assert.equal(sameEvent(a, b), true);
  });

  test('a short contained title merges only when venue/geo corroborate', () => {
    const base = { title: 'Artbat', venue: { name: 'Forbindelsehallen', address: '', district: 'd' } };
    const longer = { title: 'Artbat / Stockholm' };
    // Different venues, no coordinates -> not enough to merge.
    assert.equal(
      sameEvent(event(base), event({ ...longer, venue: { name: 'Debaser', address: '', district: 'd' } })),
      false,
    );
    // Same coordinates corroborate the short containment -> merge.
    assert.equal(
      sameEvent(
        event({ ...base, venue: { name: 'Forbindelsehallen', address: '', district: 'd', latitude: 59.31, longitude: 18.07 } }),
        event({ ...longer, venue: { name: 'Forbindelsehallen', address: '', district: 'd', latitude: 59.31, longitude: 18.07 } }),
      ),
      true,
    );
  });

  test('does not merge clearly different titles even at the same venue', () => {
    const a = event({ title: 'Techno Night', venue: { name: 'Slakthuset', address: '', district: 'd' } });
    const b = event({ title: 'Poetry Slam', venue: { name: 'Slakthuset', address: '', district: 'd' } });
    assert.equal(sameEvent(a, b), false);
  });

  test('merges a borderline title when coordinates coincide', () => {
    const a = event({
      title: 'Höstfest på Trädgården',
      venue: { name: 'Trädgården', address: '', district: 'd', latitude: 59.3045, longitude: 18.0785 },
    });
    const b = event({
      title: 'Höstfest Trädgården 2026',
      venue: { name: 'The Garden', address: '', district: 'd', latitude: 59.30451, longitude: 18.07852 },
    });
    assert.equal(sameEvent(a, b), true);
  });

  test('keeps a borderline title apart when venue and geo do not corroborate', () => {
    const a = event({ title: 'Höstfest på Trädgården', venue: { name: 'Trädgården', address: '', district: 'd' } });
    const b = event({ title: 'Höstfest Debaser 2026', venue: { name: 'Debaser', address: '', district: 'd' } });
    assert.equal(sameEvent(a, b), false);
  });

  test('identical titles at two known different venues do not merge', () => {
    const a = event({ title: 'Språkcafé på svenska', venue: { name: 'Hornstulls bibliotek', address: '', district: 'd' } });
    const b = event({ title: 'Språkcafé på svenska', venue: { name: 'Kungsholmens bibliotek', address: '', district: 'd' } });
    assert.equal(sameEvent(a, b), false);
  });

  test('identical titles at one venue still merge', () => {
    const a = event({ title: 'Språkcafé på svenska', venue: { name: 'Hornstulls bibliotek', address: '', district: 'd' } });
    const b = event({ title: 'Språkcafé på svenska', venue: { name: 'Hornstulls biblioteket', address: '', district: 'd' } });
    assert.equal(sameEvent(a, b), true);
  });

  test('identical titles merge when one venue is generic', () => {
    const a = event({ title: 'Språkcafé på svenska', venue: { name: 'Hornstulls bibliotek', address: '', district: 'd' } });
    const b = event({ title: 'Språkcafé på svenska', venue: { name: 'Stockholm', address: '', district: 'd' } });
    assert.equal(sameEvent(a, b), true);
  });

  test('identical titles merge when neither venue is known', () => {
    const a = event({ title: 'Språkcafé på svenska', venue: { name: '', address: '', district: 'd' } });
    const b = event({ title: 'Språkcafé på svenska', venue: { name: '', address: '', district: 'd' } });
    assert.equal(sameEvent(a, b), true);
  });
});
