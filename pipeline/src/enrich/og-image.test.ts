import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '../shared/event.js';
import { enrichEventsWithImages } from './enrich-images.js';
import { parseOgImage } from './og-image.js';

const BASE = 'https://organizer.example/event';

describe('parseOgImage', () => {
  test('reads og:image (property before content)', () => {
    const html = '<meta property="og:image" content="https://cdn.example/a.jpg">';
    assert.equal(parseOgImage(html, BASE), 'https://cdn.example/a.jpg');
  });

  test('reads og:image (content before property)', () => {
    const html = '<meta content="https://cdn.example/b.jpg" property="og:image" />';
    assert.equal(parseOgImage(html, BASE), 'https://cdn.example/b.jpg');
  });

  test('resolves relative URLs against the page URL', () => {
    const html = '<meta property="og:image" content="/img/hero.png">';
    assert.equal(parseOgImage(html, BASE), 'https://organizer.example/img/hero.png');
  });

  test('decodes HTML entities in the URL', () => {
    const html = '<meta property="og:image" content="https://cdn.example/x.jpg?a=1&amp;b=2">';
    assert.equal(parseOgImage(html, BASE), 'https://cdn.example/x.jpg?a=1&b=2');
  });

  test('prefers secure_url, then falls back to twitter:image', () => {
    const secure =
      '<meta property="og:image:secure_url" content="https://cdn.example/secure.jpg">' +
      '<meta property="og:image" content="https://cdn.example/plain.jpg">';
    assert.equal(parseOgImage(secure, BASE), 'https://cdn.example/secure.jpg');

    const twitter = '<meta name="twitter:image" content="https://cdn.example/tw.jpg">';
    assert.equal(parseOgImage(twitter, BASE), 'https://cdn.example/tw.jpg');
  });

  test('returns null when no image meta is present', () => {
    assert.equal(parseOgImage('<meta name="description" content="hi">', BASE), null);
    assert.equal(parseOgImage('<html><body>no meta</body></html>', BASE), null);
  });
});

function makeEvent(overrides: Partial<StockholmEvent>): StockholmEvent {
  return {
    id: 'x',
    title: 't',
    description: 'd',
    category: 'other',
    imageUrl: 'https://fallback.example/cat.jpg',
    startsAt: '2026-07-01T10:00:00.000Z',
    venue: { name: 'v', address: 'a', district: 'd' },
    organizer: 'o',
    source: 'visit-stockholm',
    sourceId: 's',
    updatedAt: '2026-06-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

describe('enrichEventsWithImages', () => {
  test('replaces fallback with scraped image and dedupes by URL', async () => {
    const calls: string[] = [];
    const fakeFetch = (async (url: string | URL) => {
      calls.push(String(url));
      return new Response('<meta property="og:image" content="https://cdn.example/hero.jpg">', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }) as unknown as typeof fetch;

    const events = [
      makeEvent({ id: 'a', ticketUrl: 'https://site.example/' }),
      makeEvent({ id: 'b', ticketUrl: 'https://site.example/' }),
      makeEvent({ id: 'c', ticketUrl: undefined }),
    ];

    const result = await enrichEventsWithImages(events, { fetchImpl: fakeFetch, concurrency: 4 });

    assert.equal(calls.length, 1, 'shared URL should be fetched once');
    assert.equal(result.attempted, 1);
    assert.equal(result.resolved, 2);
    assert.equal(result.events[0]!.imageUrl, 'https://cdn.example/hero.jpg');
    assert.equal(result.events[1]!.imageUrl, 'https://cdn.example/hero.jpg');
    assert.equal(result.events[2]!.imageUrl, 'https://fallback.example/cat.jpg');
  });

  test('keeps fallback when the page has no og:image', async () => {
    const fakeFetch = (async () =>
      new Response('<html><head></head></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })) as unknown as typeof fetch;

    const events = [makeEvent({ id: 'a', ticketUrl: 'https://noimage.example/' })];
    const result = await enrichEventsWithImages(events, { fetchImpl: fakeFetch });

    assert.equal(result.resolved, 0);
    assert.equal(result.events[0]!.imageUrl, 'https://fallback.example/cat.jpg');
  });
});
