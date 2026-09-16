/**
 * Checks remaining Apify credit usage this month.
 * Usage: npm run apify:usage
 */
import { loadEnv } from './shared/load-env.js';

loadEnv();

async function main(): Promise<void> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set');
  const headers = { Authorization: `Bearer ${token}` } as const;

  const res = await fetch('https://api.apify.com/v2/users/me/usage/monthly', { headers });
  if (!res.ok) throw new Error(`usage fetch failed: HTTP ${res.status}`);
  const usage = (await res.json()) as {
    data?: {
      totalUsageUsd?: number;
      perActor?: Record<string, { totalUsageUsd?: number }>;
    };
  };
  console.log('monthly usage USD:', usage.data?.totalUsageUsd?.toFixed(3) ?? 'n/a');
  for (const [actor, u] of Object.entries(usage.data?.perActor ?? {})) {
    console.log(`  ${actor}: $${u.totalUsageUsd?.toFixed(3) ?? '?'}`);
  }
}

void main();
