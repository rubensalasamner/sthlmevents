/**
 * Cost model for the Apify Facebook Events source.
 * Prices fetched live from the Apify Store API on 2026-09-14.
 *
 * Actor candidates (per-event pricing on FREE tier):
 *   1. apify/facebook-events-scraper              $0.013/event, $0.001/start
 *   2. crawlerbros/facebook-events-scraper        $0.002/event, $0.05/start
 *   3. scrapegeist/facebook-organizer-events      $0.004/event, $0.00005/start
 *
 * Billing facts verified 2026-09-15 (user's real run + docs):
 *  - Free plan: $5 usage credit/month, no card. PPE charges draw from it.
 *    Credit exhausted -> access blocked until next cycle (no surprise bill).
 *  - The real run charged exactly items*0.013 + 0.001 ($0.599 for 46): the
 *    actor's platform usage (compute) is included in the event price.
 *  - The actor input has NO cursor/exclude/"since" parameter (verified input
 *    schema of build 0.0.83: only searchQueries, startUrls, maxEvents), so a
 *    daily run re-pays for every event still shown by FB search. Cost is
 *    therefore controlled by cadence + date-windowed startUrls, not pointers.
 */

export const ACTORS = {
  official: { label: 'apify/facebook-events-scraper', perEvent: 0.013, perStart: 0.001 },
  crawlerbros: { label: 'crawlerbros/facebook-events-scraper', perEvent: 0.002, perStart: 0.05 },
  scrapegeist: { label: 'scrapegeist/facebook-organizer-events-scraper', perEvent: 0.004, perStart: 0.00005 },
} as const;

export type ApifyActor = keyof typeof ACTORS;

export function costPerMonth(
  actor: { perEvent: number; perStart: number },
  runsPerDay: number,
  eventsPerRun: number,
): number {
  return actor.perStart * runsPerDay * 30 + actor.perEvent * eventsPerRun * runsPerDay * 30;
}

/**
 * scenarios: [label, runs/day, events charged/run]
 * eventsPerRun = what FB search actually RETURNS (Apify charges every item
 * it emits, including past and foreign events the pipeline later filters).
 * Verified run 2026-09-15: 46 items per daily run of 3 queries.
 */
const SCENARIOS = [
  ['Daglig, 3 queries, ingen datumkontroll (mätt)', 1, 46],
  ['Daglig, datumfönster (endast framtida)', 1, 25],
  ['Veckovis, datumfönster', 1 / 7, 25],
  ['Veckovis, datumfönster, maxEvents 20', 1 / 7, 20],
] as const;

const FREE_CREDIT = 5;

console.log('=== Månadskostnad, apify/facebook-events-scraper (FREE-plan, $5 kredit) ===\n');
for (const [label, runsPerDay, eventsPerRun] of SCENARIOS) {
  const cost = costPerMonth(ACTORS.official, runsPerDay, eventsPerRun);
  const fits = cost <= FREE_CREDIT ? 'inom $5-krediten' : `ÖVER $5-krediten (+$${(cost - FREE_CREDIT).toFixed(2)})`;
  console.log(`  ${label.padEnd(48)} $${cost.toFixed(2)}/mån — ${fits}`);
}

console.log();
console.log('=== Planjämförelse ===');
console.log('Free   : $5 användning/mån, inget kort krävs, slut på kredit => blockad till nästa månad');
console.log('Starter: $19/mån varav $19 är förbetalda credits (dvs samma peng, bara förskottsbetalt)');
console.log('         + Bronze-priser ($0.010/event). Lönsamst först vid >~1400 events/mån.');
console.log();
console.log('Slutsats: veckovis körning med datumfönster håller källan gratis permanent.');
