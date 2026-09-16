import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApifyInstagramAdapter } from './adapter.js';
import type { IgPostRaw } from './types.js';

const FIXTURE: IgPostRaw[] = [
  {
    shortCode: 'abc1',
    caption: 'Sample Sale Stockholm\nFri 25/9 10-18.00\nBiblioteksgatan 5',
    timestamp: '2026-09-14T10:00:00.000Z',
    imageUrl: 'https://example.com/a.jpg',
    likesCount: 120,
    commentsCount: 4,
    ownerUsername: 'brand',
    location: null,
  },
  {
    shortCode: 'noise1',
    caption: 'GIVEAWAY vinn presentkort, follow + länk i bio!',
    timestamp: '2026-09-14T10:00:00.000Z',
    location: null,
  },
  {
    // Ottawa post: no Stockholm hint -> dropped even with a date.
    shortCode: 'intl1',
    caption: 'Sample sale Ottawa 25/9 10-18',
    timestamp: '2026-09-14T10:00:00.000Z',
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

test('fetch: keeps only Stockholm event-like posts and maps them', async () => {
  const adapter = new ApifyInstagramAdapter({
    token: 'test-token',
    queries: ['sample sale Stockholm'],
    today: TODAY,
    fetchImpl: okFetch(FIXTURE),
  });
  const events = await adapter.fetch();
  assert.equal(events.length, 1);
  assert.equal(events[0]!.sourceId, 'abc1');
  assert.match(events[0]!.startsAt, /^2026-09-25T/);
});

test('fetch: throws without token', async () => {
  const adapter = new ApifyInstagramAdapter({ today: TODAY, fetchImpl: okFetch([]) });
  delete process.env.APIFY_TOKEN;
  await assert.rejects(adapter.fetch(), /APIFY_TOKEN not set/);
});

test('fetch: actor failure surfaces as an error (snapshot keeps stale data)', async () => {
  const failing: typeof fetch = (async () => new Response('boom', { status: 500 })) as unknown as typeof fetch;
  const adapter = new ApifyInstagramAdapter({
    token: 'test-token',
    today: TODAY,
    fetchImpl: failing,
  });
  await assert.rejects(adapter.fetch(), /Apify run failed: HTTP 500/);
});
