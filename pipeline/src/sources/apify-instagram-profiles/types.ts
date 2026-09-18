import type { IgPostRaw } from '../apify-instagram/types.js';

export const APIFY_INSTAGRAM_PROFILES_SOURCE = 'apify-instagram-profiles';

export type RunProfileScraperOptions = {
  token: string;
  input: {
    /** Instagram usernames (no @) or profile URLs. */
    username: string[];
    /** Max posts returned per profile. */
    resultsLimit?: number;
  };
  /** Hard ceiling on what one run may charge (USD). */
  maxTotalChargeUsd?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

const ACTOR_ID = 'apify~instagram-post-scraper';
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Runs `apify/instagram-post-scraper` and returns dataset items in one call.
 * Charging (FREE tier, verified 2026-09-17 on @stockholm_samplesale):
 * $0.0027 per returned post, no start fee.
 */
export async function runProfileScraper(options: RunProfileScraperOptions): Promise<IgPostRaw[]> {
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
