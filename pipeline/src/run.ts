import { loadEnv } from './shared/load-env.js';
import { getAdapter } from './sources/index.js';

/**
 * Dev CLI: fetch one source and print a summary.
 *   npm run fetch:visit-stockholm            (all pages)
 *   tsx src/run.ts visit-stockholm 1         (first page only)
 */
async function main(): Promise<void> {
  loadEnv();
  const sourceId = process.argv[2];
  const maxPages = process.argv[3] ? Number(process.argv[3]) : undefined;

  if (!sourceId) {
    console.error('Usage: tsx src/run.ts <source-id> [maxPages]');
    process.exit(1);
  }

  const adapter = getAdapter(sourceId);
  const started = Date.now();
  const events = await adapter.fetch({ maxPages });
  const elapsedMs = Date.now() - started;

  const byCategory = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.category] = (acc[event.category] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\nSource: ${adapter.id}`);
  console.log(`Fetched ${events.length} events in ${elapsedMs} ms`);
  console.log('By category:', byCategory);
  console.log('\nSample:');
  for (const event of events.slice(0, 3)) {
    console.log(`- ${event.title}`);
    console.log(`    ${event.startsAt} | ${event.category} | ${event.venue.name}`);
    console.log(`    ${event.sourceUrl ?? event.ticketUrl ?? '(no url)'}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
