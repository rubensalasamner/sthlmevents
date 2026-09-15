/**
 * Probe: runs the actor once per query, measures yield + cost, writes a
 * JSON report. Cheap-first guard: each run gets maxEvents + maxTotalChargeUsd
 * so a runaway query can't burn the credit.
 *
 * Usage:
 *   APIFY_TOKEN=xxx npx tsx src/sources/apify-facebook/probe.ts [--tier1|--tier2|--all]
 *
 * Every run's input uses maxEvents=30, keeping worst-case spend per query
 * at 30 * $0.013 + $0.001 ≈ $0.39 on the FREE tier.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { loadEnv } from '../../shared/load-env.js';
import { queriesForTier, type ApifyQueryTier } from './queries.js';
import { ACTORS } from './cost-model.js';
import { looksLikeStockholmEvent as isStockholmEvent } from './mapper.js';
import { runEventsScraper, type ApifyFbEventRaw } from './types.js';

type QueryResult = {
  query: string;
  events: number;
  futureEvents: number;
  uniqueTitles: number;
  stockholmEvents: number;
  withImage: number;
  withDescription: number;
  medianGoing: number | null;
  estimatedCostUsd: number;
  sampleTitles: string[];
  error?: string;
};

const MAX_EVENTS_PER_RUN = 30;
const MAX_CHARGE_PER_RUN = 0.5;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? sorted[sorted.length - 1];
  if (upper === undefined) return null;
  const lower = sorted[mid - 1] ?? upper;
  return sorted.length % 2 ? upper : (lower + upper) / 2;
}

export function analyze(query: string, raw: ApifyFbEventRaw[]): QueryResult {
  const now = Date.now();
  const future = raw.filter((e) => e.utcStartDate && new Date(e.utcStartDate).getTime() >= now);
  const stockholm = raw.filter(isStockholmEvent);
  const going = raw
    .map((e) => (e.usersGoing ?? 0) + (e.usersInterested ?? 0))
    .filter((n) => n > 0);

  return {
    query,
    events: raw.length,
    futureEvents: future.length,
    uniqueTitles: new Set(raw.map((e) => e.name?.toLowerCase().trim())).size,
    stockholmEvents: stockholm.length,
    withImage: raw.filter((e) => Boolean(e.imageUrl)).length,
    withDescription: raw.filter((e) => Boolean(e.description)).length,
    medianGoing: median(going),
    estimatedCostUsd: ACTORS.official.perStart + raw.length * ACTORS.official.perEvent,
    sampleTitles: raw.slice(0, 5).map((e) => e.name ?? '(untitled)'),
  };
}

async function main(): Promise<void> {
  loadEnv();
  const tierArg = process.argv.find((arg) => arg.startsWith('--'));
  const tier: ApifyQueryTier = tierArg === '--tier2' ? 'tier2' : 'tier1';
  const runBoth = tierArg === '--all';
  const tiers: ApifyQueryTier[] = runBoth ? ['tier1', 'tier2'] : [tier];

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.error('APIFY_TOKEN not set. Export it first: export APIFY_TOKEN=apify_api_...');
    process.exit(1);
  }

  const results: QueryResult[] = [];
  let sessionCost = 0;

  for (const t of tiers) {
    for (const query of queriesForTier(t)) {
      process.stdout.write(`[probe] "${query}" ... `);
      try {
        const raw = await runEventsScraper({
          token,
          input: { searchQueries: [query], maxEvents: MAX_EVENTS_PER_RUN },
          maxTotalChargeUsd: MAX_CHARGE_PER_RUN,
        });
        const result = analyze(query, raw);
        sessionCost += result.estimatedCostUsd;
        results.push(result);
        console.log(
          `${result.events} events (${result.futureEvents} future, ` +
            `${result.stockholmEvents} Stockholm) ~$${result.estimatedCostUsd.toFixed(3)}`,
        );
        if (result.sampleTitles.length > 0) {
          console.log('         e.g.', result.sampleTitles.slice(0, 3).join(' | '));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log('FAILED:', message.slice(0, 120));
        results.push({
          query,
          events: 0,
          futureEvents: 0,
          uniqueTitles: 0,
          stockholmEvents: 0,
          withImage: 0,
          withDescription: 0,
          medianGoing: null,
          estimatedCostUsd: 0,
          sampleTitles: [],
          error: message,
        });
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sessionCostUsd: Number(sessionCost.toFixed(3)),
    results,
  };

  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '.cache');
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `probe-report-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\n[probe] session cost ~$${sessionCost.toFixed(3)}; report: ${outFile}`);

  const viable = results
    .filter((r) => !r.error && r.stockholmEvents > 0)
    .sort((a, b) => b.stockholmEvents - a.stockholmEvents);
  console.log('\n[probe] Queries worth scheduling (Stockholm yield > 0):');
  for (const r of viable) {
    console.log(
      `  "${r.query}" -> ${r.stockholmEvents}/${r.events} Stockholm ` +
        `(future ${r.futureEvents}, images ${r.withImage})`,
    );
  }
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isDirectRun) {
  void main();
}
