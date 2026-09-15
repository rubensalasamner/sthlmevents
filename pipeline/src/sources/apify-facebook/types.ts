export const APIFY_FACEBOOK_SOURCE = 'apify-facebook';

/**
 * Raw dataset item shape from apify/facebook-events-scraper.
 * VERIFIED against a real run (2026-09-15): the actor emits FLAT keys —
 * "location.name", "location.city", "location.countryCode" are literal
 * property names, not a nested location object. Some items omit imageUrl,
 * duration or location entirely.
 */
export type ApifyFbEventRaw = {
  name: string;
  url: string;
  imageUrl?: string;
  description?: string;
  /** ISO-8601 UTC instant, e.g. "2026-09-18T09:30:00.000Z". */
  utcStartDate: string;
  /** Human text, e.g. "3 days" | "11 hr" | null. */
  duration?: string | null;
  usersGoing?: number;
  usersInterested?: number;
  /** "Event by <organizer>". */
  organizedBy?: string;
  'location.name'?: string | null;
  'location.city'?: string | null;
  'location.countryCode'?: string | null;
  ticketUrl?: string;
};

export type RunActorOptions = {
  token: string;
  input: { searchQueries?: string[]; startUrls?: string[]; maxEvents?: number };
  /** Hard ceiling on what one run may charge (USD). */
  maxTotalChargeUsd?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

const ACTOR_ID = 'apify~facebook-events-scraper';
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Runs the actor and returns its dataset items in one call
 * (run-sync-get-dataset-items: no second API roundtrip).
 */
export async function runEventsScraper(options: RunActorOptions): Promise<ApifyFbEventRaw[]> {
  const { token, input, maxTotalChargeUsd, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch, signal } =
    options;

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

  return (await response.json()) as ApifyFbEventRaw[];
}
