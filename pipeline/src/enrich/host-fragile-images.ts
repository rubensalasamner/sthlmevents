import { createHash } from 'node:crypto';

import type { StockholmEvent } from '../shared/event.js';
import { fallbackImageFor } from '../shared/images.js';
import type { KeyedCache } from '../shared/file-cache.js';
import { imageExtension, isFragileImageUrl } from './fragile-image.js';
import { putR2Object, type R2Config } from './r2-client.js';

export type HostFragileImagesOptions = {
  r2: R2Config;
  /** Maps source image URL → hosted public URL (or null on permanent failure). */
  cache?: KeyedCache<string>;
  fetchImpl?: typeof fetch;
  concurrency?: number;
  timeoutMs?: number;
  maxBytes?: number;
  onProgress?: (done: number, total: number) => void;
};

export type HostFragileImagesResult = {
  events: StockholmEvent[];
  hosted: number;
  failed: number;
  attempted: number;
};

async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]!);
    }
  });
  await Promise.all(runners);
}

/**
 * Download Facebook/Instagram CDN images and re-host on R2 so signed URLs
 * don't rot in the snapshot. Failures fall back to the category placeholder —
 * a stable Unsplash beat a broken frame.
 */
export async function hostFragileImages(
  events: readonly StockholmEvent[],
  options: HostFragileImagesOptions,
): Promise<HostFragileImagesResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const concurrency = options.concurrency ?? 4;
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;

  const fragileUrls = [
    ...new Set(events.map((e) => e.imageUrl).filter((url) => isFragileImageUrl(url))),
  ];

  const hostedBySource = new Map<string, string | null>();
  let done = 0;
  let hosted = 0;
  let failed = 0;

  await mapWithConcurrency(fragileUrls, concurrency, async (sourceUrl) => {
    const cached = options.cache?.get(sourceUrl);
    if (cached !== undefined) {
      hostedBySource.set(sourceUrl, cached);
      if (cached) hosted += 1;
      else failed += 1;
      done += 1;
      options.onProgress?.(done, fragileUrls.length);
      return;
    }

    try {
      const publicUrl = await downloadAndUpload(sourceUrl, {
        r2: options.r2,
        fetchImpl,
        timeoutMs,
        maxBytes,
      });
      options.cache?.set(sourceUrl, publicUrl);
      hostedBySource.set(sourceUrl, publicUrl);
      hosted += 1;
    } catch {
      options.cache?.set(sourceUrl, null);
      hostedBySource.set(sourceUrl, null);
      failed += 1;
    }
    done += 1;
    options.onProgress?.(done, fragileUrls.length);
  });

  const next = events.map((event) => {
    if (!isFragileImageUrl(event.imageUrl)) return event;
    const hostedUrl = hostedBySource.get(event.imageUrl);
    if (hostedUrl) return { ...event, imageUrl: hostedUrl };
    // Download/upload failed — don't leave a dying CDN link in the snapshot.
    return { ...event, imageUrl: fallbackImageFor(event.category) };
  });

  return { events: next, hosted, failed, attempted: fragileUrls.length };
}

async function downloadAndUpload(
  sourceUrl: string,
  opts: {
    r2: R2Config;
    fetchImpl: typeof fetch;
    timeoutMs: number;
    maxBytes: number;
  },
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const response = await opts.fetchImpl(sourceUrl, {
      signal: controller.signal,
      headers: {
        // Some CDNs 403 bare fetches; a browser UA is enough for FB/IG assets.
        'user-agent':
          'Mozilla/5.0 (compatible; sthlmevents-pipeline/1.0; +https://github.com/sthlmevents)',
        accept: 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`download ${response.status}`);
    }
    const contentType = response.headers.get('content-type');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > opts.maxBytes) {
      throw new Error(`bad size ${buffer.byteLength}`);
    }
    if (contentType && !contentType.toLowerCase().startsWith('image/')) {
      throw new Error(`not an image: ${contentType}`);
    }

    const ext = imageExtension(contentType, sourceUrl);
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 32);
    const key = `images/${hash}.${ext}`;

    return putR2Object(opts.r2, {
      key,
      body: buffer,
      contentType: contentType?.split(';')[0]?.trim() || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      cacheControl: 'public, max-age=31536000, immutable',
    }, opts.fetchImpl);
  } finally {
    clearTimeout(timer);
  }
}
