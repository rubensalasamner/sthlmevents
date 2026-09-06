import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { RemoteEventSource } from './remote-event-source.js';

const SNAPSHOT = {
  attribution: 'Test attribution',
  events: [
    {
      id: 'a',
      title: 'Past event',
      description: '',
      category: 'other',
      imageUrl: '',
      startsAt: '2020-01-01T10:00:00Z',
      venue: { name: 'V', address: '', district: 'D' },
      organizer: 'O',
      source: 'test',
      sourceId: 'a',
      sourceUrl: 'https://example.com/a',
      updatedAt: '2020-01-01T00:00:00Z',
      isFeatured: false,
      qualityScore: 1,
    },
    {
      id: 'b',
      title: 'Later event',
      description: '',
      category: 'music',
      imageUrl: '',
      startsAt: '2099-06-02T10:00:00Z',
      venue: { name: 'V', address: '', district: 'D' },
      organizer: 'O',
      source: 'test',
      sourceId: 'b',
      sourceUrl: 'https://example.com/b',
      updatedAt: '2020-01-01T00:00:00Z',
      isFeatured: false,
      qualityScore: 1,
    },
    {
      id: 'c',
      title: 'Sooner event',
      description: '',
      category: 'art',
      imageUrl: '',
      startsAt: '2099-06-01T10:00:00Z',
      venue: { name: 'V', address: '', district: 'D' },
      organizer: 'O',
      source: 'test',
      sourceId: 'c',
      sourceUrl: 'https://example.com/c',
      updatedAt: '2020-01-01T00:00:00Z',
      isFeatured: false,
      qualityScore: 1,
    },
  ],
};

function jsonResponse(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;
}

describe('RemoteEventSource', () => {
  test('loads, filters ended events and sorts chronologically', async () => {
    const source = new RemoteEventSource('https://example.test/snapshot.json', jsonResponse(SNAPSHOT));
    const events = await source.list();
    assert.deepEqual(events.map((event) => event.id), ['c', 'b'], 'ended events dropped, chronological');
    assert.equal(source.attribution, 'Test attribution');
  });

  test('getById finds loaded events', async () => {
    const source = new RemoteEventSource('https://example.test/snapshot.json', jsonResponse(SNAPSHOT));
    assert.equal((await source.getById('b'))?.title, 'Later event');
    assert.equal(await source.getById('missing'), null);
  });

  test('non-OK responses reject list()', async () => {
    const source = new RemoteEventSource('https://example.test/snapshot.json', jsonResponse({ message: 'no' }, 500));
    await assert.rejects(source.list(), /Snapshot fetch failed: 500/);
  });
});
