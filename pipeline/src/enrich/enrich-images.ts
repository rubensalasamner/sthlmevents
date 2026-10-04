import type { StockholmEvent } from '../shared/event.js';
import {
  isCategoryFallbackImage,
  isPlausibleImageUrl,
} from '../shared/images.js';
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

/** Prefer the editorial page over a ticket checkout URL for og:image. */
export function enrichmentPageUrl(event: StockholmEvent): string | undefined {
  return event.sourceUrl || event.ticketUrl || undefined;
}

/**
 * Apply a scraped image only when the current one is a category placeholder or
 * otherwise unusable (e.g. a ticket-flow URL wrongly stored as imageUrl).
 */
export function shouldReplaceEventImage(currentUrl: string, candidate: string): boolean {
  if (!isPlausibleImageUrl(candidate)) return false;
  if (isCategoryFallbackImage(currentUrl)) return true;
  if (!isPlausibleImageUrl(currentUrl)) return true;
  return false;
}

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

function sanitizeCachedImage(image: string | null): string | null {
  if (image === null) return null;
  return isPlausibleImageUrl(image) ? image : null;
}

/**
 * Pipeline stage: replace category-fallback (or poisoned) images with a real
 * og:image scraped from each event's editorial `sourceUrl`, falling back to
 * `ticketUrl`. Deduplicates by page URL, is cache-first, and never overwrites
 * a plausible source-provided hero. Adapters never touch this — it runs over
 * the combined event set.
 */
export async function enrichEventsWithImages(
  events: readonly StockholmEvent[],
  options: EnrichImagesOptions = {},
): Promise<EnrichImagesResult> {
  const cache = options.cache ?? new NullImageCache();
  const concurrency = options.concurrency ?? 8;

  const uniqueUrls = [
    ...new Set(events.map(enrichmentPageUrl).filter((u): u is string => !!u)),
  ];

  const imageByUrl = new Map<string, string | null>();
  let done = 0;

  await mapWithConcurrency(uniqueUrls, concurrency, async (url) => {
    const cached = cache.get(url);
    if (cached !== undefined) {
      const sanitized = sanitizeCachedImage(cached);
      // Poisoned positive cache (e.g. old tix og:image) — re-scrape once.
      if (cached !== null && sanitized === null) {
        const image = await resolveOgImage(url, {
          fetchImpl: options.fetchImpl,
          timeoutMs: options.timeoutMs,
        });
        const plausible = image && isPlausibleImageUrl(image) ? image : null;
        cache.set(url, plausible);
        imageByUrl.set(url, plausible);
      } else {
        imageByUrl.set(url, sanitized);
      }
    } else {
      const image = await resolveOgImage(url, {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs,
      });
      const plausible = image && isPlausibleImageUrl(image) ? image : null;
      cache.set(url, plausible);
      imageByUrl.set(url, plausible);
    }
    done += 1;
    options.onProgress?.(done, uniqueUrls.length);
  });

  let resolved = 0;
  const enriched = events.map((event) => {
    const pageUrl = enrichmentPageUrl(event);
    const image = pageUrl ? imageByUrl.get(pageUrl) : undefined;
    if (image && shouldReplaceEventImage(event.imageUrl, image)) {
      resolved += 1;
      return { ...event, imageUrl: image };
    }
    return event;
  });

  return { events: enriched, resolved, attempted: uniqueUrls.length };
}
