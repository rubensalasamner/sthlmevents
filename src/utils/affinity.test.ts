import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { AffinitySnapshot } from '@/data/affinity-storage';
import type { StockholmEvent } from '@/types/event';
import {
  diversifyFeed,
  eventAffinityScore,
  foldAffinityKey,
  preferenceScore,
  scoreAffinityKeys,
  softDistanceBoost,
  timeContextBoost,
} from '@/utils/affinity';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-13T18:00:00.000Z',
    venue: { name: 'Cirkus', address: '', district: 'd', latitude: 59.3293, longitude: 18.0686 },
    organizer: 'Cirkus',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

const NOW = new Date('2026-09-13T08:51:00.000Z'); // Sunday late morning Stockholm

describe('foldAffinityKey', () => {
  test('trims and lowercases', () => {
    assert.equal(foldAffinityKey('  Dramaten  '), 'dramaten');
  });
});

describe('scoreAffinityKeys', () => {
  test('decays older signals and floors active follows', () => {
    const snapshot: AffinitySnapshot = {
      signals: [
        { kind: 'favorite', key: 'music', at: NOW.getTime() },
        { kind: 'favorite', key: 'theatre', at: NOW.getTime() - 90 * 24 * 60 * 60 * 1000 },
      ],
      followedVenues: ['dramaten'],
      followedOrganizers: [],
    };
    const scores = scoreAffinityKeys(snapshot, NOW);
    assert.ok((scores.get('music') ?? 0) > (scores.get('theatre') ?? 0));
    assert.equal(scores.get('dramaten'), 6);
  });
});

describe('eventAffinityScore', () => {
  test('sums category venue and organizer', () => {
    const snapshot: AffinitySnapshot = {
      signals: [],
      followedVenues: ['cirkus'],
      followedOrganizers: [],
    };
    const keys = new Map([
      ['music', 2],
      ['cirkus', 4],
    ]);
    const score = eventAffinityScore(
      event({ category: 'music', venue: { name: 'Cirkus', address: '', district: 'd' }, organizer: 'Other' }),
      keys,
      snapshot,
    );
    assert.ok(score >= 6);
  });
});

describe('timeContextBoost', () => {
  test('boosts art on weekend daytime', () => {
    assert.ok(timeContextBoost('art', NOW) > 0);
    assert.equal(timeContextBoost('nightlife', NOW), 0);
  });

  test('boosts nightlife on Friday evening', () => {
    const friEve = new Date('2026-09-11T19:00:00.000Z'); // Fri 21:00 Stockholm
    assert.ok(timeContextBoost('nightlife', friEve) > 0);
  });
});

describe('softDistanceBoost', () => {
  test('scores nearer venues higher', () => {
    const origin = { latitude: 59.3293, longitude: 18.0686 };
    const near = event({
      venue: { name: 'v', address: '', district: 'd', latitude: 59.33, longitude: 18.07 },
    });
    const far = event({
      venue: { name: 'v', address: '', district: 'd', latitude: 59.4, longitude: 18.2 },
    });
    assert.ok(softDistanceBoost(near, origin) > softDistanceBoost(far, origin));
  });
});

describe('preferenceScore', () => {
  test('explicit vibes dominate affinity', () => {
    const music = event({ id: 'm', category: 'music' });
    const art = event({ id: 'a', category: 'art' });
    const withVibes = preferenceScore(music, {
      preferredCategories: new Set(['music']),
      keyScores: new Map([['art', 50]]),
      now: NOW,
    });
    const artAffinity = preferenceScore(art, {
      preferredCategories: new Set(['music']),
      keyScores: new Map([['art', 50]]),
      now: NOW,
    });
    assert.ok(withVibes > artAffinity);
  });
});

describe('diversifyFeed', () => {
  test('breaks long same-category runs when alternatives exist', () => {
    const input = [
      event({ id: 'm1', category: 'music' }),
      event({ id: 'm2', category: 'music' }),
      event({ id: 'm3', category: 'music' }),
      event({ id: 'a1', category: 'art' }),
    ];
    const out = diversifyFeed(input, 2);
    assert.deepEqual(
      out.map((e) => e.id),
      ['m1', 'm2', 'a1', 'm3'],
    );
  });
});
