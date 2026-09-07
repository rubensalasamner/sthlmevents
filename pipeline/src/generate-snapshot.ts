import { writeFile } from 'node:fs/promises';

import { loadEnv } from './shared/load-env.js';
import { enrichEventsWithImages } from './enrich/enrich-images.js';
import { FileImageCache } from './enrich/image-cache.js';
import { categorizeEvents } from './categorize/categorize-events.js';
import { OpenAiCategorizer } from './categorize/categorizer.js';
import { geocodeEvents } from './geocode/geocode-events.js';
import { NominatimGeocoder, type Coordinate } from './geocode/geocoder.js';
import { FileKeyedCache } from './shared/file-cache.js';
import { allAdapters } from './sources/index.js';
import { dedupeEvents } from './stages/dedup.js';
import type { StockholmEvent } from './shared/event.js';

/**
 * Builds the event snapshot the app ships with:
 *   all sources -> dedupe -> scrape og:images -> write one JSON.
 * This is the "no DB" bridge — run it on a schedule (the daily-cron model) to
 * refresh the data the app's `StaticEventSource` reads.
 *
 *   tsx src/generate-snapshot.ts
 */

const OUTPUT_URL = new URL('../../src/data/events.snapshot.json', import.meta.url);
const CACHE_URL = new URL('../.cache/og-images.json', import.meta.url);
const GEOCODE_CACHE_URL = new URL('../.cache/geocodes.json', import.meta.url);
const CATEGORY_CACHE_URL = new URL('../.cache/categories.json', import.meta.url);

const ATTRIBUTION =
  'Includes event data from Visit Stockholm (Stockholm Business Region), CC BY 4.0; loppiskartan.se; public Eventbrite listings; Resident Advisor (ra.co); Ticketmaster; Luma (lu.ma); allevents.in; Meetup; Evenemangskollen; Stockholms stadsbibliotek; and Kulturhuset Stadsteatern.';

type Snapshot = {
  generatedAt: string;
  sources: string[];
  attribution: string;
  license: string;
  count: number;
  imagesResolved: number;
  events: StockholmEvent[];
};

async function main(): Promise<void> {
  loadEnv();
  const adapters = allAdapters();

  const collected: StockholmEvent[] = [];
  const sources: string[] = [];
  const failures: string[] = [];
  for (const adapter of adapters) {
    process.stdout.write(`Fetching "${adapter.id}"... `);
    let events: StockholmEvent[];
    try {
      events = await adapter.fetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A missing per-source credential (e.g. EVENEMANGSKOLLEN_API_KEY) should
      // skip that source, not kill the whole snapshot.
      if (/API_KEY/.test(message)) {
        console.log(`skipped (${message.split('. ')[0]})`);
        continue;
      }
      // A blocked or down source (bot protection, 5xx) must not abort the
      // daily refresh: yesterday's events from that source simply drop out of
      // today's snapshot. An empty run is still fatal — see below.
      console.log(`failed (${message}) — continuing with remaining sources`);
      failures.push(adapter.id);
      continue;
    }
    console.log(`${events.length} events`);
    collected.push(...events);
    sources.push(adapter.id);
  }

  if (collected.length === 0) {
    throw new Error(
      failures.length > 0
        ? `All sources failed (${failures.join(', ')}) — refusing to overwrite the snapshot with an empty one`
        : 'All sources returned zero events — refusing to overwrite the snapshot',
    );
  }
  if (failures.length > 0) {
    console.warn(
      `WARNING: ${failures.length} source(s) failed and are missing from this snapshot: ${failures.join(', ')}`,
    );
  }

  const { events: unique, duplicatesRemoved } = dedupeEvents(collected);
  console.log(`Deduplicated: ${collected.length} -> ${unique.length} (-${duplicatesRemoved})`);

  const geocodeCache = new FileKeyedCache<Coordinate>(GEOCODE_CACHE_URL.pathname);
  await geocodeCache.load();
  const { events: located, resolved: geocoded, attempted: geocodeAttempts } = await geocodeEvents(
    unique,
    {
      geocoder: new NominatimGeocoder(),
      cache: geocodeCache,
      onProgress: (done, total) => process.stdout.write(`\r  geocode ${done}/${total}`),
    },
  );
  if (geocodeAttempts > 0) process.stdout.write('\n');
  await geocodeCache.save();
  console.log(`Geocoded ${geocoded} events across ${geocodeAttempts} venue lookups`);

  const categorizerApiKey = process.env.CATEGORIZER_API_KEY;
  let categorized = unique;
  if (categorizerApiKey) {
    const categoryCache = new FileKeyedCache<'music' | 'art' | 'food' | 'sports' | 'theatre' | 'nightlife' | 'family' | 'shopping' | 'market' | 'popup' | 'comedy' | 'other' | null>(CATEGORY_CACHE_URL.pathname);
    await categoryCache.load();
    const result = await categorizeEvents(located, {
      categorizer: new OpenAiCategorizer({
        apiKey: categorizerApiKey,
        baseUrl: process.env.CATEGORIZER_BASE_URL,
        model: process.env.CATEGORIZER_MODEL,
      }),
      cache: categoryCache,
      onProgress: (done, total) => process.stdout.write(`\r  categorize ${done}/${total}`),
    });
    process.stdout.write('\n');
    await categoryCache.save();
    categorized = result.events;
    console.log(`LLM categorized ${result.categorized} of ${result.attempted} sent texts`);
  } else {
    console.log('Categorizer skipped (CATEGORIZER_API_KEY not set)');
  }

  const cache = new FileImageCache(CACHE_URL.pathname);
  await cache.load();

  let lastLogged = 0;
  const { events: enriched, resolved, attempted } = await enrichEventsWithImages(categorized, {
    cache,
    concurrency: 10,
    timeoutMs: 6000,
    onProgress: (done, total) => {
      if (done - lastLogged >= 25 || done === total) {
        lastLogged = done;
        process.stdout.write(`\r  og:image ${done}/${total}`);
      }
    },
  });
  process.stdout.write('\n');
  await cache.save();

  const sorted = [...enriched].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const snapshot: Snapshot = {
    generatedAt: new Date().toISOString(),
    sources,
    attribution: ATTRIBUTION,
    license: 'CC BY 4.0',
    count: sorted.length,
    imagesResolved: resolved,
    events: sorted,
  };

  await writeFile(OUTPUT_URL, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(
    `Wrote ${sorted.length} events (${resolved}/${attempted} images resolved) to ${OUTPUT_URL.pathname}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
