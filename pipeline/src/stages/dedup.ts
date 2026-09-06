import type { StockholmEvent } from '../shared/event.js';
import { stockholmLocalDate } from '../shared/time.js';
import { DEFAULT_MATCH_CONFIG, sameEvent, type MatchConfig } from './event-matcher.js';

export { normalizeTitle } from './similarity.js';

/**
 * Cross-source deduplication. The same event often appears in several sources
 * (e.g. a concert in both Ticketmaster and Visit Stockholm, with slightly
 * different titles). Events are blocked by Stockholm-local day, then greedily
 * clustered within each block using the `sameEvent` matcher; each cluster
 * collapses to one record that keeps the richest data.
 *
 * Runs as a shared stage over the combined event set — adapters never dedupe.
 */

export type DedupeResult = {
  events: StockholmEvent[];
  duplicatesRemoved: number;
};

function hasCoords(event: StockholmEvent): boolean {
  return event.venue.latitude !== undefined && event.venue.longitude !== undefined;
}

/** Higher is preferred as the surviving primary record. */
function score(event: StockholmEvent): number {
  return event.qualityScore + (hasCoords(event) ? 1000 : 0);
}

function merge(cluster: StockholmEvent[]): StockholmEvent {
  const primary = cluster[0]!;
  const merged: StockholmEvent = { ...primary };

  for (const event of cluster) {
    if (event === primary) continue;
    if (!hasCoords(merged) && hasCoords(event)) merged.venue = event.venue;
    if (!merged.ticketUrl && event.ticketUrl) merged.ticketUrl = event.ticketUrl;
    if (!merged.endsAt && event.endsAt) merged.endsAt = event.endsAt;
    if (event.description.length > merged.description.length) {
      merged.description = event.description;
    }
  }
  return merged;
}

export function dedupeEvents(
  events: readonly StockholmEvent[],
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
): DedupeResult {
  const blocks = new Map<string, StockholmEvent[]>();
  for (const event of events) {
    const day = stockholmLocalDate(event.startsAt);
    const block = blocks.get(day);
    if (block) block.push(event);
    else blocks.set(day, [event]);
  }

  const deduped: StockholmEvent[] = [];
  for (const block of blocks.values()) {
    // Highest-scored record first so it becomes each cluster's representative
    // (and its primary on merge); id breaks ties for deterministic clustering.
    const ordered = [...block].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));

    const clusters: StockholmEvent[][] = [];
    for (const event of ordered) {
      const cluster = clusters.find((members) => sameEvent(members[0]!, event, config));
      if (cluster) cluster.push(event);
      else clusters.push([event]);
    }

    for (const cluster of clusters) {
      deduped.push(cluster.length === 1 ? cluster[0]! : merge(cluster));
    }
  }

  return { events: deduped, duplicatesRemoved: events.length - deduped.length };
}
