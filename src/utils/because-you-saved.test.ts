import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import { buildBecauseYouSavedRail } from '@/utils/because-you-saved';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'theatre',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-20T18:00:00.000Z',
    venue: { name: 'Dramaten', address: '', district: 'Östermalm' },
    organizer: 'Dramaten',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

const NOW = new Date('2026-09-13T08:51:00.000Z');

describe('buildBecauseYouSavedRail', () => {
  test('returns null without enough related picks', () => {
    const saved = [event({ id: 'saved' })];
    assert.equal(buildBecauseYouSavedRail(saved, saved, NOW), null);
  });

  test('picks same-venue events and names the rail', () => {
    const saved = [event({ id: 'saved', title: 'Birds' })];
    const candidates = [
      event({ id: 'saved', title: 'Birds' }),
      event({ id: 'a', title: 'Parzival' }),
      event({ id: 'b', title: 'Antikrist' }),
      event({ id: 'c', title: 'Elsewhere', venue: { name: 'Other', address: '', district: 'd' } }),
    ];
    const rail = buildBecauseYouSavedRail(saved, candidates, NOW);
    assert.ok(rail);
    assert.match(rail!.title, /Dramaten/);
    assert.deepEqual(
      rail!.events.map((e) => e.id).sort(),
      ['a', 'b'],
    );
  });
});
