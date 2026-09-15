import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { APIFY_FACEBOOK_SOURCE, type ApifyFbEventRaw } from './types.js';
import { looksLikeStockholmEvent, mapFacebookEvent } from './mapper.js';
import { queriesForTier } from './queries.js';
import { facebookEventsSearchUrl } from './search-url.js';
import { runEventsScraper } from './types.js';

/** Pay-per-event: cap items per run to bound worst-case spend. */
const MAX_EVENTS_PER_RUN = 20;
/** USD ceiling per actor run (defence in depth besides maxEvents). */
const MAX_CHARGE_PER_RUN = 0.5;
/** How far ahead the date-window filter reaches (days from today). */
const WINDOW_DAYS_AHEAD = 90;

export type ApifyFacebookAdapterOptions = {
  token?: string;
  /** Overrides the tier-1 keyword schedule (used by tests and probes). */
  queries?: readonly string[];
  /** Reference "today" for the date window; defaults to now (tests inject). */
  today?: Date;
  fetchImpl?: typeof fetch;
};

/**
 * Facebook Events via the Apify Store actor `apify/facebook-events-scraper`.
 * One actor run per fetch, charging $0.001 start + $0.013 per event
 * (FREE tier).
 *
 * Cost control, each step verified against real runs:
 *  - 2026-09-15 run A ($0.599 / 46 events): maxEvents is a GLOBAL cap across
 *    queries; ~30% of charged items were past events, ~30% foreign noise.
 *  - 2026-09-15 run B (20 events, $0.26): date-windowed search URLs
 *    (startUrls + filters param) eliminated ALL past events — Facebook
 *    honours the embedded filter without a session param. This adapter now
 *    always runs through windowed URLs; foreign noise is dropped by
 *    `looksLikeStockholmEvent` after the (already paid) fetch.
 *  - No cursor/exclude parameter exists (verified input schema 0.0.83);
 *    overlap between runs is inevitable and handled by the dedupe stage.
 *    Weekly cadence keeps the source inside the Free plan's $5 credit.
 */
export class ApifyFacebookAdapter implements SourceAdapter {
  readonly id = APIFY_FACEBOOK_SOURCE;

  private readonly tokenOverride?: string;
  private readonly queries: readonly string[];
  private readonly today: Date;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApifyFacebookAdapterOptions = {}) {
    // NOTE: token is read lazily (in fetch), not here — the registry
    // instantiates adapters at module import, before loadEnv() has run.
    this.tokenOverride = options.token;
    this.queries = options.queries ?? queriesForTier('tier1');
    this.today = options.today ?? new Date();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private get token(): string | undefined {
    return this.tokenOverride ?? process.env.APIFY_TOKEN;
  }

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    if (!this.token) {
      throw new Error('APIFY_TOKEN not set. Skipping the Facebook Events source.');
    }

    const maxEvents =
      options.maxPages !== undefined ? options.maxPages * 10 : MAX_EVENTS_PER_RUN;

    const from = this.today.toISOString().slice(0, 10);
    const to = new Date(this.today.getTime() + WINDOW_DAYS_AHEAD * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const startUrls = this.queries.map((query) =>
      facebookEventsSearchUrl(query, { from, to }),
    );

    const raw = await runEventsScraper({
      token: this.token,
      input: { startUrls, maxEvents },
      maxTotalChargeUsd: MAX_CHARGE_PER_RUN,
      fetchImpl: this.fetchImpl,
    });

    return raw.filter(looksLikeStockholmEvent).map(mapFacebookEvent);
  }
}
