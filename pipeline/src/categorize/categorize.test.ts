import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { EventCategory, StockholmEvent } from '../shared/event.js';
import { NullKeyedCache, type KeyedCache } from '../shared/file-cache.js';
import type { BatchCategorizer } from './categorizer.js';
import { categorizeEvents } from './categorize-events.js';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'test:1',
    title: 'Konsert på Kafé 44',
    description: 'Musik.',
    category: 'other',
    imageUrl: '',
    startsAt: '2026-09-10T18:00:00Z',
    venue: { name: 'Kafé 44', address: '', district: 'Södermalm' },
    organizer: 'Kafé 44',
    source: 'test',
    sourceId: '1',
    sourceUrl: 'https://example.com',
    updatedAt: '2026-09-01T00:00:00Z',
    isFeatured: false,
    qualityScore: 1,
    ...overrides,
  };
}

/** Records batch sizes; maps title keywords to categories like a tiny model. */
function stubCategorizer(
  mapping: Record<string, EventCategory>,
): BatchCategorizer & { batches: string[][] } {
  return {
    batches: [],
    async categorize(inputs: readonly string[]) {
      this.batches.push([...inputs]);
      return inputs.map((text) => {
        for (const [needle, category] of Object.entries(mapping)) {
          if (text.includes(needle)) return category;
        }
        return null;
      });
    },
  } as BatchCategorizer & { batches: string[][] };
}

describe('categorizeEvents', () => {
  test('reassigns only other-events with confident classifications', async () => {
    const categorizer = stubCategorizer({ Konsert: 'music', Utställning: 'art' });
    const { events, categorized, attempted } = await categorizeEvents(
      [
        event({ id: 'a', title: 'Konsert med Lisa' }),
        event({ id: 'b', title: 'Utställning: Form' }),
        event({ id: 'c', title: 'Okäntdropp' }),
        event({ id: 'd', title: 'Redan musik', category: 'music' }),
      ],
      { categorizer },
    );

    assert.equal(events.find((e) => e.id === 'a')?.category, 'music');
    assert.equal(events.find((e) => e.id === 'b')?.category, 'art');
    assert.equal(events.find((e) => e.id === 'c')?.category, 'other');
    // d kept its adapter category and was never sent.
    assert.equal(events.find((e) => e.id === 'd')?.category, 'music');
    assert.equal(categorized, 2);
    assert.ok(categorizer.batches.every((batch) => batch.every((text) => !text.includes('Redan musik'))));
  });

  test('caches classifications per distinct text', async () => {
    const categorizer = stubCategorizer({ Konsert: 'music' });
    const store = new Map<string, EventCategory | null>();
    const cache: KeyedCache<EventCategory> = {
      get: (key: string) => store.get(key),
      set: (key: string, value: EventCategory | null) => store.set(key, value),
    };
    // description '' keeps the classification text equal to the title.
    const duplicated = [
      event({ id: 'a', title: 'Konsert X', description: '' }),
      event({ id: 'b', title: 'Konsert X', description: '' }),
    ];

    await categorizeEvents(duplicated, { categorizer, cache });
    assert.equal(store.get('cat:Konsert X'), 'music');
    assert.equal(categorizer.batches.length, 1);
    assert.equal(categorizer.batches[0]?.length, 1, 'identical texts collapse to one item');

    const second = await categorizeEvents([event({ id: 'c', title: 'Konsert X', description: '' })], {
      categorizer,
      cache,
    });
    assert.equal(categorizer.batches.length, 1, 'cache hit does not call the provider');
    assert.equal(second.events[0]?.category, 'music');
  });

  test('respects batchSize and reports progress', async () => {
    const categorizer = stubCategorizer({});
    const seen: Array<[number, number]> = [];
    await categorizeEvents(
      Array.from({ length: 5 }, (_, index) => event({ id: `e${index}`, title: `Event ${index}` })),
      { categorizer, batchSize: 2, onProgress: (done, total) => seen.push([done, total]) },
    );
    assert.deepEqual(categorizer.batches.map((batch) => batch.length), [2, 2, 1]);
    assert.deepEqual(seen, [[2, 5], [4, 5], [5, 5]]);
  });

  test('empty input goes straight through', async () => {
    const categorizer = stubCategorizer({});
    const { categorized, attempted } = await categorizeEvents([], { categorizer });
    assert.equal(categorized, 0);
    assert.equal(attempted, 0);
    assert.equal(categorizer.batches.length, 0);
  });
});
