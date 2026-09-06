# sthlmevents pipeline

Standalone (Node/TypeScript) event ingestion pipeline. It fetches events from
external sources and maps them to the app's shared `StockholmEvent` model
(`../src/types/event.ts`). Storage (Supabase) is wired in later — for now
adapters run and are unit-tested in isolation.

## Architecture

```
SourceAdapter.fetch()  ->  StockholmEvent[]
   (one per source)              |
                                 v
                    dedupe (cross-source)          <- implemented
                                 |
                                 v
           enrich (og:image, cached)          <- implemented
                                 |
                                 v
   shared stages (later): geocode -> rank -> upsert -> expire
                                 |
                                 v
        generate-snapshot -> src/data/events.snapshot.json
                                 |
                                 v
        app StaticEventSource  (real data, no DB)
```

Adapters are deliberately dumb: they only fetch + map their own source.
Cross-source concerns (enrichment, dedup, geocoding, persistence) are separate
stages that run over the combined event set.

### Image enrichment

Sources like Visit Stockholm ship no images. The enrichment stage scrapes each
event's `ticketUrl` for its Open Graph / Twitter card image, deduplicating by
URL and caching results in `.cache/og-images.json` (30-day TTL, 3-day negative
TTL). Events with no resolvable image keep their category fallback.

### Snapshot -> app

`generate-snapshot` runs a source + enrichment and writes
`../src/data/events.snapshot.json`, which the app's `StaticEventSource` serves.
This is the "no database" bridge: re-run it on a schedule (the daily-cron model)
to refresh the app's data.

## Sources

| id | Source | Access | License / notes |
| --- | --- | --- | --- |
| `visit-stockholm` | Visit Stockholm SBR Public API (`api.visitstockholm.com/api/public-v1`) | Open, no key | CC BY 4.0 (attribution required) |
| `loppiskartan` | loppiskartan.se dated flea-market calendar | HTML scrape (pure, tested parser), filtered to "Stockholms län" | Flea markets / one-off loppisar; free entry; no coordinates |

### Deferred / blocked sources (researched)

- **Kulturbiljetter** (`api/v3/events/`): real REST API but requires an
  `Authorization` header — needs a requested API key.
- **Stockholms stadsbibliotek** `/evenemang`: client-rendered; events load from
  an endpoint not present in the static bundle — needs headless discovery.
- **Parkteatern / Kulturhuset Stadsteatern** `/kalender`: client-rendered, no
  SSR events and no per-event JSON-LD on the calendar — needs its API.
- **Kulturdirekt**: defunct (skip).

### Visit Stockholm notes / known gaps

- **No images** in the API — mapped to a category fallback image; enrich with
  scraped `og:image` later.
- **No price** — `priceSek` left `undefined` ("See details" in the UI).
- **Recurring/long events** — mapped to a start/end range; `schedule.dates`
  can drive date filtering later.
- Titles/descriptions are bilingual; we prefer `en`, fall back to `sv`.

## Usage

```bash
cd pipeline
npm install

npm run typecheck
npm test
npm run fetch:visit-stockholm      # live fetch, prints a summary
tsx src/run.ts visit-stockholm 1   # first page only

npm run snapshot                   # fetch + enrich -> src/data/events.snapshot.json
tsx src/generate-snapshot.ts 2     # limit to 2 pages while developing
```
