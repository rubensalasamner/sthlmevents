import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { loadEnv } from './shared/load-env.js';
import { enrichEventsWithImages } from './enrich/enrich-images.js';
import { FileImageCache } from './enrich/image-cache.js';
import { hostFragileImages } from './enrich/host-fragile-images.js';
import { readR2ConfigFromEnv } from './enrich/r2-client.js';
import { categorizeEvents } from './categorize/categorize-events.js';
import { OpenAiCategorizer } from './categorize/categorizer.js';
import { FallbackCategorizer } from './categorize/fallback-categorizer.js';
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

/** Comma-separated preferred models; first entry is tried first. */
const CATEGORIZER_MODEL_CHAIN = (process.env.CATEGORIZER_MODEL ?? '')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);


const OUTPUT_URL = new URL('../../src/data/events.snapshot.json', import.meta.url);
const CACHE_URL = new URL('../.cache/og-images.json', import.meta.url);
const HOSTED_IMAGES_CACHE_URL = new URL('../.cache/hosted-images.json', import.meta.url);
const GEOCODE_CACHE_URL = new URL('../.cache/geocodes.json', import.meta.url);
const CATEGORY_CACHE_URL = new URL('../.cache/categories.json', import.meta.url);

const ATTRIBUTION =
  'Includes event data from Visit Stockholm (Stockholm Business Region), CC BY 4.0; loppiskartan.se; public Eventbrite listings; Resident Advisor (ra.co); Ticketmaster; Luma (lu.ma); allevents.in; Meetup; Evenemangskollen; Stockholms stadsbibliotek; Kulturhuset Stadsteatern; and Kulturbiljetter.';

type Snapshot = {
  generatedAt: string;
  sources: string[];
  attribution: string;
  license: string;
  count: number;
  imagesResolved: number;
  events: StockholmEvent[];
};

/** Reads the current snapshot, tolerating absence (first run ever). */
async function readExistingSnapshot(): Promise<Snapshot | null> {
  try {
    return JSON.parse(await readFile(fileURLToPath(OUTPUT_URL), 'utf8')) as Snapshot;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  loadEnv();

  // `--only <id,id,...>` refreshes just those sources and keeps the other
  // sources' events from the existing snapshot (partial refresh — e.g. an
  // Apify-only run at ~$0.50 instead of refetching all 12 free sources).
  const onlyArg = process.argv.indexOf('--only');
  const onlyIds =
    onlyArg >= 0
      ? (process.argv[onlyArg + 1] ?? '').split(',').map((id) => id.trim()).filter(Boolean)
      : undefined;
  if (onlyIds && onlyIds.length === 0) {
    throw new Error('--only given without source ids');
  }

  const previous = await readExistingSnapshot();
  const adapters = allAdapters().filter(
    (adapter) => !onlyIds || onlyIds.includes(adapter.id),
  );
  if (onlyIds) {
    const known = new Set(allAdapters().map((a) => a.id));
    for (const id of onlyIds) {
      if (!known.has(id)) {
        throw new Error(`Unknown --only source "${id}". Known: ${[...known].join(', ')}`);
      }
    }
    console.log(`Partial refresh: ${onlyIds.join(', ')} (other sources kept from previous snapshot)`);
  }

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

  // In --only mode a failed refresh keeps the previous events for that source
  // (stale beats missing); a successful run replaces them wholesale.
  const keptFromPrevious =
    onlyIds && previous
      ? previous.events.filter(
          (event) =>
            !onlyIds.includes(event.source) ||
            (failures.includes(event.source) && !sources.includes(event.source)),
        )
      : previous?.events ?? [];
  if (onlyIds) {
    console.log(
      `Keeping ${keptFromPrevious.length} events from untouched sources` +
        (failures.length > 0 ? `; stale data kept for failed: ${failures.join(', ')}` : ''),
    );
  }
  if (collected.length === 0 && keptFromPrevious.length === 0) {
    throw new Error(
      failures.length > 0
        ? `All sources failed (${failures.join(', ')}) — refusing to overwrite the snapshot with an empty one`
        : 'All sources returned zero events — refusing to overwrite the snapshot',
    );
  }
  if (failures.length > 0 && !onlyIds) {
    console.warn(
      `WARNING: ${failures.length} source(s) failed and are missing from this snapshot: ${failures.join(', ')}`,
    );
  }

  const combined = [...keptFromPrevious, ...collected];
  const { events: unique, duplicatesRemoved } = dedupeEvents(combined);
  console.log(`Deduplicated: ${combined.length} -> ${unique.length} (-${duplicatesRemoved})`);

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
  let categorized = located;
  if (categorizerApiKey) {
    const categoryCache = new FileKeyedCache<'music' | 'art' | 'food' | 'sports' | 'theatre' | 'nightlife' | 'family' | 'shopping' | 'market' | 'popup' | 'comedy' | 'other' | null>(CATEGORY_CACHE_URL.pathname);
    await categoryCache.load();
    try {
      const result = await categorizeEvents(located, {
        categorizer: new FallbackCategorizer(
          (CATEGORIZER_MODEL_CHAIN.length > 0
            ? CATEGORIZER_MODEL_CHAIN
            : ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']
          ).map(
            (model) =>
              new OpenAiCategorizer({
                apiKey: categorizerApiKey,
                baseUrl: process.env.CATEGORIZER_BASE_URL,
                model,
              }),
          ),
        ),
        cache: categoryCache,
        onProgress: (done, total) => process.stdout.write(`\r  categorize ${done}/${total}`),
      });
      process.stdout.write('\n');
      categorized = result.events;
      console.log(`LLM categorized ${result.categorized} of ${result.attempted} sent texts`);
    } catch (error) {
      // The category pass is an enhancement, never a gate: a provider outage
      // must not discard an otherwise complete snapshot. Cached answers from
      // earlier batches are still saved; the rest keep their keyword category.
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`\nCategorizer failed (${message}) — continuing with keyword-based categories`);
    }
    await categoryCache.save();
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

  let afterHost = enriched;
  const r2 = readR2ConfigFromEnv();
  if (r2) {
    const hostedCache = new FileKeyedCache<string>(HOSTED_IMAGES_CACHE_URL.pathname);
    await hostedCache.load();
    let lastHostLogged = 0;
    const hostedResult = await hostFragileImages(enriched, {
      r2,
      cache: hostedCache,
      concurrency: 4,
      onProgress: (done, total) => {
        if (done - lastHostLogged >= 5 || done === total) {
          lastHostLogged = done;
          process.stdout.write(`\r  host images ${done}/${total}`);
        }
      },
    });
    if (hostedResult.attempted > 0) process.stdout.write('\n');
    await hostedCache.save();
    afterHost = hostedResult.events;
    console.log(
      `Hosted ${hostedResult.hosted}/${hostedResult.attempted} fragile images on R2` +
        (hostedResult.failed > 0 ? ` (${hostedResult.failed} → category fallback)` : ''),
    );
  } else {
    console.log('R2 image hosting skipped (R2_* / R2_PUBLIC_BASE_URL not set)');
  }

  const sorted = [...afterHost].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const snapshot: Snapshot = {
    generatedAt: new Date().toISOString(),
    // In --only mode the previous snapshot's source list is authoritative for
    // the untouched sources; refreshed/failed ids come from this run.
    sources: [
      ...new Set([
        ...(previous?.sources ?? []).filter(
          (id) => !onlyIds || !onlyIds.includes(id) || failures.includes(id),
        ),
        ...sources,
      ]),
    ],
    attribution: ATTRIBUTION,
    license: 'CC BY 4.0',
    count: sorted.length,
    imagesResolved: resolved,
    events: sorted,
  };

  // Minified: ~20% smaller on R2 and inside the APK. Pretty-printing was only
  // useful for reviewing daily diffs; the data is bot-committed anyway.
  await writeFile(OUTPUT_URL, JSON.stringify(snapshot), 'utf8');
  console.log(
    `Wrote ${sorted.length} events (${resolved}/${attempted} images resolved) to ${OUTPUT_URL.pathname}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
