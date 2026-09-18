/**
 * Checks Apify credit usage this billing cycle.
 * Usage: npm run apify:usage
 */
import { loadEnv } from './shared/load-env.js';

loadEnv();

async function main(): Promise<void> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set');
  const headers = { Authorization: `Bearer ${token}` } as const;

  const [usageRes, limRes] = await Promise.all([
    fetch('https://api.apify.com/v2/users/me/usage/monthly', { headers }),
    fetch('https://api.apify.com/v2/users/me/limits', { headers }),
  ]);
  if (!usageRes.ok) throw new Error(`usage fetch failed: HTTP ${usageRes.status}`);
  if (!limRes.ok) throw new Error(`limits fetch failed: HTTP ${limRes.status}`);

  const usage = (await usageRes.json()) as {
    data?: {
      usageCycle?: { startAt?: string; endAt?: string };
      totalUsageCreditsUsdBeforeVolumeDiscount?: number;
      totalUsageCreditsUsdAfterVolumeDiscount?: number;
      monthlyServiceUsage?: Record<string, { quantity?: number; amountUsd?: number }>;
    };
  };
  const lim = (await limRes.json()) as {
    data?: { limits?: { maxMonthlyUsageUsd?: number } };
  };

  const u = usage.data ?? {};
  const used = u.totalUsageCreditsUsdAfterVolumeDiscount ?? 0;
  const cap = lim.data?.limits?.maxMonthlyUsageUsd ?? 0;

  console.log(`cycle: ${u.usageCycle?.startAt ?? '?'} → ${u.usageCycle?.endAt ?? '?'}`);
  console.log(`used:      $${used.toFixed(4)}`);
  console.log(`cap:       $${cap.toFixed(2)}`);
  console.log(`remaining: $${(cap - used).toFixed(4)}`);

  const services = Object.entries(u.monthlyServiceUsage ?? {}).filter(
    ([, v]) => (v.amountUsd ?? 0) > 0,
  );
  if (services.length > 0) {
    console.log('services:');
    for (const [name, v] of services) {
      console.log(`  ${name}: $${Number(v.amountUsd).toFixed(4)} (qty ${v.quantity ?? '?'})`);
    }
  }
}

void main();
