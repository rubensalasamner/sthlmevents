import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { APIFY_QUERIES_TIER1, APIFY_QUERIES_TIER2, queriesForTier } from './queries.js';
import { analyze } from './probe.js';
import type { ApifyFbEventRaw } from './types.js';

describe('apify queries', () => {
  it('tiers do not overlap and are non-empty', () => {
    const t1 = queriesForTier('tier1');
    const t2 = queriesForTier('tier2');
    assert.ok(t1.length > 0);
    assert.ok(t2.length > 0);
    for (const q of t1) assert.ok(!t2.includes(q));
  });
});

describe('probe analyze', () => {
  const now = Date.now();

  it('classifies future vs past and Stockholm relevance', () => {
    const raw: ApifyFbEventRaw[] = [
      {
        name: 'Sample Sale Stockholm',
        url: 'https://www.facebook.com/events/1/',
        utcStartDate: new Date(now + 86_400_000).toISOString(),
        'location.name': 'Grev Turegatan 45, Stockholm',
        'location.countryCode': 'SE',
        usersGoing: 40,
        usersInterested: 10,
        imageUrl: 'https://example.com/a.jpg',
      },
      {
        name: 'Old Flea Market',
        url: 'https://www.facebook.com/events/2/',
        utcStartDate: new Date(now - 86_400_000).toISOString(),
        'location.name': 'Nowhere 1, Uppsala',
        'location.countryCode': 'SE',
      },
      {
        name: 'US pop up sale',
        url: 'https://www.facebook.com/events/3/',
        utcStartDate: new Date(now + 86_400_000).toISOString(),
        'location.name': '126 High Street, Flemington, PA',
        'location.countryCode': 'US',
      },
    ];

    const result = analyze('test', raw);
    assert.equal(result.events, 3);
    assert.equal(result.futureEvents, 2);
    assert.equal(result.uniqueTitles, 3);
    assert.equal(result.stockholmEvents, 1);
    assert.equal(result.withImage, 1);
    assert.equal(result.medianGoing, 50);
  });

  it('handles empty results without crashing', () => {
    const result = analyze('empty', []);
    assert.equal(result.events, 0);
    assert.equal(result.medianGoing, null);
  });
});
