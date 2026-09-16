/**
 * Raw dataset item shape from apify/instagram-hashtag-scraper.
 * VERIFIED against two real runs (2026-09-16, 31 posts): every post carries
 * timestamp/imageUrl/caption/engagement; `location` was null on ALL posts —
 * venue lives inside the caption text and must be parsed there.
 */
export const APIFY_INSTAGRAM_SOURCE = 'apify-instagram';

export type IgPostRaw = {
  /** Short code is the stable post id (instagram.com/p/<shortCode>/). */
  shortCode?: string;
  id?: string;
  caption?: string | null;
  /** ISO-8601 UTC instant of the POST, not the event. */
  timestamp?: string;
  imageUrl?: string;
  displayUrl?: string;
  url?: string;
  likesCount?: number;
  commentsCount?: number;
  ownerUsername?: string;
  ownerFullName?: string;
  location?: { name?: string } | null;
  hashtags?: string[];
};

export type RunHashtagScraperOptions = {
  token: string;
  input: {
    hashtags: string[];
    keywordSearch?: boolean;
    resultsType?: 'posts' | 'reels' | 'stories';
    /** Cap per hashtag/keyword — the actor's own cost lever. */
    resultsLimit?: number;
  };
  /** Hard ceiling on what one run may charge (USD). */
  maxTotalChargeUsd?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

const ACTOR_ID = 'apify~instagram-hashtag-scraper';
const DEFAULT_TIMEOUT_MS = 4 * 60 * 1000;

/**
 * Runs the actor and returns its dataset items in one call
 * (run-sync-get-dataset-items: no second API roundtrip).
 * Charging (FREE tier, verified): $0.0026 per returned post, no start fee.
 */
export async function runHashtagScraper(options: RunHashtagScraperOptions): Promise<IgPostRaw[]> {
  const {
    token,
    input,
    maxTotalChargeUsd,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
    signal,
  } = options;

  const url = new URL(`https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items`);
  url.searchParams.set('token', token);
  if (maxTotalChargeUsd !== undefined) {
    url.searchParams.set('maxTotalChargeUsd', String(maxTotalChargeUsd));
  }

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: signal ?? AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Apify run failed: HTTP ${response.status} ${body.slice(0, 300)}`);
  }

  return (await response.json()) as IgPostRaw[];
}
