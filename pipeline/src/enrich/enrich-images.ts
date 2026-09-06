import type { StockholmEvent } from '../shared/event.js';
import { NullImageCache, type ImageCache } from './image-cache.js';
import { resolveOgImage } from './og-image.js';

export type EnrichImagesOptions = {
  cache?: ImageCache;
  fetchImpl?: typeof fetch;
  concurrency?: number;
  timeoutMs?: number;
  onProgress?: (done: number, total: number) => void;
};

export type EnrichImagesResult = {
  events: StockholmEvent[];
  resolved: number;
  attempted: number;
};

/** Runs an async worker over items with a fixed concurrency limit. */
async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]!, index);
    }
  });
  await Promise.all(runners);
}

/**
 * Pipeline stage: replace category-fallback images with a real og:image scraped
 * from each event's `ticketUrl`. Deduplicates by URL (many events share one
 * organizer site), is cache-first, and leaves the fallback in place on failure.
 * Adapters never touch this — it runs over the combined event set.
 */
export async function enrichEventsWithImages(
  events: readonly StockholmEvent[],
  options: EnrichImagesOptions = {},
): Promise<EnrichImagesResult> {
  const cache = options.cache ?? new NullImageCache();
  const concurrency = options.concurrency ?? 8;

  const uniqueUrls = [...new Set(events.map((e) => e.ticketUrl).filter((u): u is string => !!u))];

  const imageByUrl = new Map<string, string | null>();
  let done = 0;

  await mapWithConcurrency(uniqueUrls, concurrency, async (url) => {
    const cached = cache.get(url);
    if (cached !== undefined) {
      imageByUrl.set(url, cached);
    } else {
      const image = await resolveOgImage(url, {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs,
      });
      cache.set(url, image);
      imageByUrl.set(url, image);
    }
    done += 1;
    options.onProgress?.(done, uniqueUrls.length);
  });

  let resolved = 0;
  const enriched = events.map((event) => {
    const image = event.ticketUrl ? imageByUrl.get(event.ticketUrl) : undefined;
    if (image) {
      resolved += 1;
      return { ...event, imageUrl: image };
    }
    return event;
  });

  return { events: enriched, resolved, attempted: uniqueUrls.length };
}
