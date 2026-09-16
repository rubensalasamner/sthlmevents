import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { APIFY_INSTAGRAM_SOURCE, type IgPostRaw } from './types.js';
import { runHashtagScraper } from './types.js';
import { igQueriesForTier } from './queries.js';
import { looksLikeStockholmPost, parseCaptionDate } from './caption.js';
import { mapInstagramPost } from './mapper.js';

/** resultsLimit is PER TERM: 4 terms x 20 = 80 posts worst case ≈ $0.21. */
const RESULTS_LIMIT_PER_TERM = 20;
/** USD ceiling per actor run (defence in depth besides resultsLimit). */
const MAX_CHARGE_PER_RUN = 0.3;

export type ApifyInstagramAdapterOptions = {
  token?: string;
  /** Overrides the tier-1 term schedule (used by tests and probes). */
  queries?: readonly string[];
  /** Reference "today" for caption date parsing; defaults to now (tests inject). */
  today?: Date;
  fetchImpl?: typeof fetch;
};

/**
 * Instagram long-tail events via `apify/instagram-hashtag-scraper`
 * (keywordSearch mode). One actor run per fetch, charging $0.0026 per
 * returned post, no start fee (FREE tier, verified 2026-09-16).
 *
 * Behaviour verified against two real probe runs (31 posts):
 *  - every post has timestamp/image/caption/engagement
 *  - NO structured location on any post — venue is parsed from the caption
 *  - no date filter exists (unlike FB events) — freshness is bounded by
 *    resultsLimit and the weekly cadence; posts already ended are dropped
 *    below by the parse-window check
 *  - the actor treats `hashtags` entries as keyword searches when
 *    `keywordSearch: true`, which multi-word phrases need
 *
 * IG acts as the LONG-TAIL complement: the shared dedupe stage collapses
 * anything that also surfaced as a Facebook event, so only posts with no
 * structured-source counterpart survive into the snapshot.
 */
export class ApifyInstagramAdapter implements SourceAdapter {
  readonly id = APIFY_INSTAGRAM_SOURCE;

  private readonly tokenOverride?: string;
  private readonly queries: readonly string[];
  private readonly today: Date;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApifyInstagramAdapterOptions = {}) {
    // NOTE: token is read lazily (in fetch), not here — the registry
    // instantiates adapters at module import, before loadEnv() has run.
    this.tokenOverride = options.token;
    this.queries = options.queries ?? igQueriesForTier('tier1');
    this.today = options.today ?? new Date();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private get token(): string | undefined {
    return this.tokenOverride ?? process.env.APIFY_TOKEN;
  }

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    if (!this.token) {
      throw new Error('APIFY_TOKEN not set. Skipping the Instagram Events source.');
    }

    const limitPerTerm =
      options.maxPages !== undefined ? options.maxPages * 10 : RESULTS_LIMIT_PER_TERM;

    const raw: IgPostRaw[] = await runHashtagScraper({
      token: this.token,
      input: {
        hashtags: [...this.queries],
        keywordSearch: true,
        resultsType: 'posts',
        resultsLimit: limitPerTerm,
      },
      maxTotalChargeUsd: MAX_CHARGE_PER_RUN,
      fetchImpl: this.fetchImpl,
    });

    const events: StockholmEvent[] = [];
    for (const post of raw) {
      const parsed = parseCaptionDate(post.caption ?? '', this.today);
      if (!looksLikeStockholmPost(post, parsed)) continue;
      events.push(mapInstagramPost(post, parsed));
    }
    return events;
  }
}
