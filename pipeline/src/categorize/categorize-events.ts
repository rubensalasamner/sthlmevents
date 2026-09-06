import type { EventCategory, StockholmEvent } from '../shared/event.js';
import { NullKeyedCache, type KeyedCache } from '../shared/file-cache.js';
import type { BatchCategorizer } from './categorizer.js';

export type CategorizeEventsOptions = {
  categorizer: BatchCategorizer;
  cache?: KeyedCache<EventCategory>;
  /** Items per LLM call. Kept modest to bound per-request token cost. */
  batchSize?: number;
  onProgress?: (done: number, total: number) => void;
};

export type CategorizeEventsResult = {
  events: StockholmEvent[];
  /** Events the LLM reassigned from `other` to a concrete category. */
  categorized: number;
  /** Distinct texts sent to the provider (cache misses), across batches. */
  attempted: number;
};

const CACHE_KEY_PREFIX = 'cat:';

function classificationInput(event: StockholmEvent): string {
  return [event.title, event.description].filter(Boolean).join('\n').slice(0, 600);
}

/**
 * Pipeline stage: refine `category: 'other'` events with an LLM classifier.
 * Only unclassified events are sent; texts are deduplicated across events and
 * cached, so repeated runs and identical titles cost nothing. Anything the
 * model cannot confidently classify stays `other` — adapters keep their
 * keyword-based first pass, this is the second pass over the leftovers.
 */
export async function categorizeEvents(
  events: readonly StockholmEvent[],
  options: CategorizeEventsOptions,
): Promise<CategorizeEventsResult> {
  const cache = options.cache ?? new NullKeyedCache<string>();
  const batchSize = options.batchSize ?? 40;

  const pending = events.filter((event) => event.category === 'other');
  const textByKey = new Map<string, string>();
  const keyByEvent = new Map<StockholmEvent, string>();
  for (const event of pending) {
    const text = classificationInput(event);
    if (!text) continue;
    const key = CACHE_KEY_PREFIX + text;
    textByKey.set(key, text);
    keyByEvent.set(event, key);
  }

  const classification = new Map<string, EventCategory | null>();
  let attempted = 0;

  const uncached: string[] = [];
  for (const [key, text] of textByKey) {
    const cached = cache.get(key);
    if (cached === undefined) {
      uncached.push(text);
    } else {
      classification.set(key, cached);
    }
  }

  for (let offset = 0; offset < uncached.length; offset += batchSize) {
    const batch = uncached.slice(offset, offset + batchSize);
    const results = await options.categorizer.categorize(batch);
    attempted += batch.length;
    results.forEach((result, index) => {
      const text = batch[index];
      if (text !== undefined) classification.set(CACHE_KEY_PREFIX + text, result);
      if (text !== undefined) cache.set(CACHE_KEY_PREFIX + text, result);
    });
    options.onProgress?.(Math.min(offset + batchSize, uncached.length), uncached.length);
  }

  let categorized = 0;
  const enriched = events.map((event) => {
    const key = keyByEvent.get(event);
    const category = key ? classification.get(key) : undefined;
    if (category && event.category === 'other') {
      categorized += 1;
      return { ...event, category };
    }
    return event;
  });

  return { events: enriched, categorized, attempted };
}
