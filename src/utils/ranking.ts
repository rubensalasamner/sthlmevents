import type { StockholmEvent } from '@/types/event';

/**
 * Hybrid ranking: featured events first, then by quality signal, then soonest.
 * Pure and side-effect free so it can be reused identically once events come
 * from the real backend instead of the mock source.
 */
export function rankEvents(events: readonly StockholmEvent[]): StockholmEvent[] {
  return [...events].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}

/** Featured events only, ordered by quality — used by the Discover carousel. */
export function featuredEvents(events: readonly StockholmEvent[]): StockholmEvent[] {
  return rankEvents(events.filter((event) => event.isFeatured));
}
