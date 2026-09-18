import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getAdapter } from '../index.js';
import type { IgPostRaw } from '../apify-instagram/types.js';
import { ApifyInstagramProfilesAdapter } from './adapter.js';

const FIXTURE: IgPostRaw[] = [
  {
    shortCode: 'sale1',
    caption:
      'Past Tense Sample Sale 11-13/9 2026\nFri 11/9 : 14:00 - 19:00\nBirkagatan 29\nStockholm',
    timestamp: '2026-09-10T10:00:00.000Z',
    displayUrl: 'https://example.com/a.jpg',
    likesCount: 40,
    ownerUsername: 'stockholm_samplesale',
    location: null,
  },
  {
    shortCode: 'noise1',
    caption: 'GIVEAWAY vinn presentkort, follow + länk i bio!',
    timestamp: '2026-09-10T10:00:00.000Z',
    location: null,
  },
  {
    // No date in caption -> dropped (would need OCR).
    shortCode: 'nodate',
    caption: 'Big sale coming soon at A-House Stockholm #samplesale',
    timestamp: '2026-09-10T10:00:00.000Z',
    location: null,
  },
];

const TODAY = new Date('2026-09-16T08:00:00.000Z');

function okFetch(items: IgPostRaw[]): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(items), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;
}

test('fetch: maps curated posts with caption dates; drops noise and undated', async () => {
  const adapter = new ApifyInstagramProfilesAdapter({
    token: 'test-token',
    profiles: ['stockholm_samplesale'],
    today: TODAY,
    fetchImpl: okFetch(FIXTURE),
  });
  const events = await adapter.fetch();
  assert.equal(events.length, 1);
  assert.equal(events[0]!.source, 'apify-instagram-profiles');
  assert.equal(events[0]!.sourceId, 'sale1');
  assert.equal(events[0]!.id, 'apify-instagram-profiles:sale1');
  assert.equal(events[0]!.category, 'popup');
  assert.match(events[0]!.startsAt, /^2026-09-1[13]T/);
});

test('fetch: throws without token', async () => {
  const adapter = new ApifyInstagramProfilesAdapter({ today: TODAY, fetchImpl: okFetch([]) });
  delete process.env.APIFY_TOKEN;
  await assert.rejects(adapter.fetch(), /APIFY_TOKEN not set/);
});

test('fetch: empty allowlist returns [] without calling Apify', async () => {
  let called = false;
  const spy: typeof fetch = (async () => {
    called = true;
    return new Response('[]', { status: 200 });
  }) as unknown as typeof fetch;
  const adapter = new ApifyInstagramProfilesAdapter({
    token: 'test-token',
    profiles: [],
    today: TODAY,
    fetchImpl: spy,
  });
  assert.deepEqual(await adapter.fetch(), []);
  assert.equal(called, false);
});

test('fetch: actor failure surfaces as an error', async () => {
  const failing: typeof fetch = (async () =>
    new Response('boom', { status: 500 })) as unknown as typeof fetch;
  const adapter = new ApifyInstagramProfilesAdapter({
    token: 'test-token',
    profiles: ['stockholm_samplesale'],
    today: TODAY,
    fetchImpl: failing,
  });
  await assert.rejects(adapter.fetch(), /Apify run failed: HTTP 500/);
});

test('is registered in SOURCE_ADAPTERS', () => {
  assert.equal(getAdapter('apify-instagram-profiles').id, 'apify-instagram-profiles');
});
