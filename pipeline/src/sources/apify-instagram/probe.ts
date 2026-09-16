/**
 * One-off probe for the Instagram source: runs apify/instagram-hashtag-scraper
 * with a small hashtag set, then analyzes the yield the same way the FB probe
 * does — Stockholm share, event-likeness, caption date-signal.
 *
 * Usage: npm run probe:ig
 * Cost: ~$0.0026 × results (default cap 80 → ~$0.21 of the $5 monthly credit).
 */
import { loadEnv } from '../../shared/load-env.js';
import { analyze } from './ig-analyze.js';

const ACTOR_ID = 'apify~instagram-hashtag-scraper';

/** Stockholm-narrow probes: 2 hashtags + 2 keyword searches, mixed modes. */
const PROBE_INPUT = {
  hashtags: ['loppisstockholm', 'utförsäljning', 'sample sale Stockholm', 'stockholmevents'],
  keywordSearch: true,
  resultsType: 'posts',
  resultsLimit: 20,
} as const;

const MAX_RESULTS = 80;

type IgPostRaw = {
  id?: string;
  shortCode?: string;
  caption?: string;
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

async function runProbe(token: string): Promise<IgPostRaw[]> {
  const url = new URL(`https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items`);
  url.searchParams.set('token', token);
  url.searchParams.set('maxTotalChargeUsd', '0.30');
  const timeout = AbortSignal.timeout(4 * 60 * 1000);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...PROBE_INPUT, resultsLimit: PROBE_INPUT.resultsLimit }),
    signal: timeout,
  });
  if (!res.ok) {
    throw new Error(`Apify run failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as IgPostRaw[];
}

async function main(): Promise<void> {
  loadEnv();
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set');

  console.log('running IG probe with input:', JSON.stringify(PROBE_INPUT, null, 2));
  const posts = await runProbe(token);
  console.log(`\ngot ${posts.length} posts`);
  analyze(posts.slice(0, MAX_RESULTS));
}

void main();
