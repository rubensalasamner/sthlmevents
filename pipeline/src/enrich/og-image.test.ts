import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '../shared/event.js';
import { fallbackImageFor } from '../shared/images.js';
import {
  enrichEventsWithImages,
  enrichmentPageUrl,
  shouldReplaceEventImage,
} from './enrich-images.js';
import { FileImageCache } from './image-cache.js';
import { parseOgImage } from './og-image.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

  test('rejects tix buying-flow og:image values', () => {
    const html =
      '<meta property="og:image" content="https://tix.kulturhusetstadsteatern.se/sv/buyingflow/tickets/1/2/Kulturhuset%20Stadsteatern">';
    assert.equal(parseOgImage(html, 'https://tix.example/page'), null);
  });
});

function makeEvent(overrides: Partial<StockholmEvent>): StockholmEvent {
  return {
    id: 'x',
    title: 't',
    description: 'd',
    category: 'other',
    imageUrl: fallbackImageFor('other'),
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

describe('enrichmentPageUrl / shouldReplaceEventImage', () => {
  test('prefers sourceUrl over ticketUrl', () => {
    assert.equal(
      enrichmentPageUrl(
        makeEvent({
          sourceUrl: 'https://editorial.example/show',
          ticketUrl: 'https://tix.example/buy',
        }),
      ),
      'https://editorial.example/show',
    );
    assert.equal(
      enrichmentPageUrl(makeEvent({ ticketUrl: 'https://tix.example/buy' })),
      'https://tix.example/buy',
    );
  });

  test('replaces fallbacks and poisoned URLs, keeps real heroes', () => {
    const hero = 'https://cdn.example/real-hero.jpg';
    const scraped = 'https://cdn.example/og.jpg';
    const poison =
      'https://tix.kulturhusetstadsteatern.se/sv/buyingflow/tickets/1/2/Kulturhuset%20Stadsteatern';

    assert.equal(shouldReplaceEventImage(fallbackImageFor('art'), scraped), true);
    assert.equal(shouldReplaceEventImage(poison, scraped), true);
    assert.equal(shouldReplaceEventImage(hero, scraped), false);
    assert.equal(shouldReplaceEventImage(fallbackImageFor('art'), poison), false);
  });
});

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
    assert.equal(result.events[2]!.imageUrl, fallbackImageFor('other'));
  });

  test('scrapes sourceUrl instead of ticket checkout', async () => {
    const calls: string[] = [];
    const fakeFetch = (async (url: string | URL) => {
      calls.push(String(url));
      return new Response(
        '<meta property="og:image" content="https://kulturhusetstadsteatern.se/sites/default/files/omfamnad.jpg">',
        { status: 200, headers: { 'content-type': 'text/html' } },
      );
    }) as unknown as typeof fetch;

    const poison =
      'https://tix.kulturhusetstadsteatern.se/sv/buyingflow/tickets/30042/123595/Kulturhuset%20Stadsteatern';
    const events = [
      makeEvent({
        id: 'omfamnad',
        source: 'kulturhuset',
        category: 'art',
        imageUrl: poison,
        sourceUrl: 'https://kulturhusetstadsteatern.se/utstallningar/omfamnad',
        ticketUrl: 'https://tix.kulturhusetstadsteatern.se/sv/buyingflow/tickets/30042/123595/',
      }),
    ];

    const result = await enrichEventsWithImages(events, { fetchImpl: fakeFetch });

    assert.deepEqual(calls, ['https://kulturhusetstadsteatern.se/utstallningar/omfamnad']);
    assert.equal(
      result.events[0]!.imageUrl,
      'https://kulturhusetstadsteatern.se/sites/default/files/omfamnad.jpg',
    );
  });

  test('does not overwrite a plausible source-provided hero', async () => {
    const hero = 'https://biblioteket.stockholm.se/cdn/strapi/large_real.jpg';
    const fakeFetch = (async () =>
      new Response('<meta property="og:image" content="https://cdn.example/other.jpg">', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })) as unknown as typeof fetch;

    const result = await enrichEventsWithImages(
      [
        makeEvent({
          id: 'a',
          imageUrl: hero,
          sourceUrl: 'https://biblioteket.stockholm.se/event/1',
        }),
      ],
      { fetchImpl: fakeFetch },
    );

    assert.equal(result.resolved, 0);
    assert.equal(result.events[0]!.imageUrl, hero);
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
    assert.equal(result.events[0]!.imageUrl, fallbackImageFor('other'));
  });

  test('re-scrapes when the cache holds a poisoned non-image URL', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'og-cache-'));
    const cachePath = join(dir, 'og-images.json');
    const cache = new FileImageCache(cachePath);
    const page = 'https://tix.kulturhusetstadsteatern.se/sv/buyingflow/tickets/1/2/';
    cache.set(
      page,
      'https://tix.kulturhusetstadsteatern.se/sv/buyingflow/tickets/1/2/Kulturhuset%20Stadsteatern',
    );

    let fetches = 0;
    const fakeFetch = (async () => {
      fetches += 1;
      return new Response('<meta property="og:image" content="https://cdn.example/fixed.jpg">', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }) as unknown as typeof fetch;

    try {
      const result = await enrichEventsWithImages(
        [makeEvent({ id: 'a', ticketUrl: page, imageUrl: fallbackImageFor('art'), category: 'art' })],
        { cache, fetchImpl: fakeFetch },
      );
      assert.equal(fetches, 1);
      assert.equal(result.events[0]!.imageUrl, 'https://cdn.example/fixed.jpg');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
