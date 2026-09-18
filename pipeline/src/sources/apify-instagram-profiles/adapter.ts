import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { parseCaptionDate } from '../apify-instagram/caption.js';
import { mapInstagramPost } from '../apify-instagram/mapper.js';
import { CURATED_IG_PROFILES } from './profiles.js';
import { APIFY_INSTAGRAM_PROFILES_SOURCE, runProfileScraper } from './types.js';

/** Posts per curated profile — enough for ~2 weeks of sale announcements. */
const RESULTS_LIMIT_PER_PROFILE = 15;
/** USD ceiling per actor run (15 posts × ~$0.0027 ≈ $0.04; headroom for more accounts). */
const MAX_CHARGE_PER_RUN = 0.15;

/** Ad/giveaway captions are never events (same intent as keyword IG). */
const NOISE_RE =
  /giveaway|vinst en|tävling:|rabattkod|restock|länk i bio$|samarbete med|annons:/i;

export type ApifyInstagramProfilesAdapterOptions = {
  token?: string;
  /** Overrides the curated allowlist (tests). */
  profiles?: readonly string[];
  /** Reference "today" for caption date parsing; defaults to now (tests inject). */
  today?: Date;
  fetchImpl?: typeof fetch;
};

/**
 * Curated Instagram profile feeds via `apify/instagram-post-scraper`.
 *
 * Strategy sibling to keyword/hashtag `apify-instagram`: this source only
 * scrapes hand-picked high-signal accounts (sample-sale roundups, etc.) whose
 * captions already carry dates and venues — verified for
 * @stockholm_samplesale (2026-09-17: 14/15 parseable without OCR).
 *
 * Stockholm geo-filter is relaxed: allowlisted accounts are Stockholm-scoped
 * by curation. Posts still need a parseable caption date and must not be noise.
 */
export class ApifyInstagramProfilesAdapter implements SourceAdapter {
  readonly id = APIFY_INSTAGRAM_PROFILES_SOURCE;

  private readonly tokenOverride?: string;
  private readonly profiles: readonly string[];
  private readonly today: Date;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApifyInstagramProfilesAdapterOptions = {}) {
    // Token read lazily in fetch — registry constructs adapters before loadEnv().
    this.tokenOverride = options.token;
    this.profiles = options.profiles ?? CURATED_IG_PROFILES;
    this.today = options.today ?? new Date();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private get token(): string | undefined {
    return this.tokenOverride ?? process.env.APIFY_TOKEN;
  }

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    if (!this.token) {
      throw new Error('APIFY_TOKEN not set. Skipping the Instagram Profiles source.');
    }
    if (this.profiles.length === 0) return [];

    const limit =
      options.maxPages !== undefined ? options.maxPages * 5 : RESULTS_LIMIT_PER_PROFILE;

    const raw = await runProfileScraper({
      token: this.token,
      input: {
        username: [...this.profiles],
        resultsLimit: limit,
      },
      maxTotalChargeUsd: MAX_CHARGE_PER_RUN,
      fetchImpl: this.fetchImpl,
    });

    const events: StockholmEvent[] = [];
    for (const post of raw) {
      const caption = post.caption ?? '';
      if (NOISE_RE.test(caption)) continue;
      const parsed = parseCaptionDate(caption, this.today);
      if (!parsed.date) continue;
      events.push(mapInstagramPost(post, parsed, APIFY_INSTAGRAM_PROFILES_SOURCE));
    }
    return events;
  }
}
