import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { imageExtension, isFragileImageUrl } from './fragile-image.js';
import { hostFragileImages } from './host-fragile-images.js';
import type { StockholmEvent } from '../shared/event.js';
import type { R2Config } from './r2-client.js';

describe('isFragileImageUrl', () => {
  test('flags Facebook / Instagram CDNs', () => {
    assert.equal(
      isFragileImageUrl('https://scontent-mrs2-3.xx.fbcdn.net/v/t39/x.jpg?oe=ABC'),
      true,
    );
    assert.equal(
      isFragileImageUrl('https://scontent-mxp1-1.cdninstagram.com/v/t51/x.jpg'),
      true,
    );
    assert.equal(
      isFragileImageUrl('https://instagram.fyhz1-1.fna.fbcdn.net/v/t51/x.jpg'),
      true,
    );
  });

  test('leaves stable hosts alone', () => {
    assert.equal(isFragileImageUrl('https://s1.ticketm.net/large.jpg'), false);
    assert.equal(isFragileImageUrl('https://images.unsplash.com/photo-1'), false);
    assert.equal(isFragileImageUrl('not-a-url'), false);
  });
});

describe('imageExtension', () => {
  test('prefers content-type', () => {
    assert.equal(imageExtension('image/png; charset=binary', 'https://x/a.jpg'), 'png');
  });

  test('falls back to path', () => {
    assert.equal(imageExtension(null, 'https://cdn.example/a.webp?x=1'), 'webp');
  });
});

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'e1',
    title: 'T',
    description: '',
    category: 'popup',
    imageUrl: 'https://scontent.xx.fbcdn.net/v/photo.jpg',
    startsAt: '2026-09-20T10:00:00.000Z',
    venue: { name: 'v', address: '', district: 'd' },
    organizer: 'o',
    source: 'apify-facebook',
    sourceId: '1',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

const R2: R2Config = {
  accountId: 'acc',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  bucket: 'bucket',
  publicBaseUrl: 'https://pub.example',
};

describe('hostFragileImages', () => {
  test('rewrites fragile URLs to the hosted public URL', async () => {
    const source = 'https://scontent.xx.fbcdn.net/v/photo.jpg';
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url === source) {
        return new Response(png, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        });
      }
      // R2 PutObject — accept anything signed.
      if (url.includes('r2.cloudflarestorage.com')) {
        assert.equal(init?.method, 'PUT');
        return new Response(null, { status: 200 });
      }
      throw new Error(`unexpected fetch ${url}`);
    };

    const result = await hostFragileImages([event({ imageUrl: source })], {
      r2: R2,
      fetchImpl,
    });

    assert.equal(result.hosted, 1);
    assert.equal(result.failed, 0);
    assert.match(result.events[0]!.imageUrl, /^https:\/\/pub\.example\/images\/[a-f0-9]+\.png$/);
  });

  test('leaves stable URLs untouched', async () => {
    const stable = event({
      imageUrl: 'https://s1.ticketm.net/large.jpg',
      category: 'music',
    });
    const result = await hostFragileImages([stable], {
      r2: R2,
      fetchImpl: async () => {
        throw new Error('should not fetch');
      },
    });
    assert.equal(result.attempted, 0);
    assert.equal(result.events[0]!.imageUrl, stable.imageUrl);
  });

  test('replaces failed fragile downloads with category fallback', async () => {
    const result = await hostFragileImages([event()], {
      r2: R2,
      fetchImpl: async () => new Response(null, { status: 403 }),
    });
    assert.equal(result.failed, 1);
    assert.match(result.events[0]!.imageUrl, /unsplash/);
  });
});
