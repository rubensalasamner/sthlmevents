import type { StockholmEvent } from '@/types/event';
import { eventInterval, isLongRunning } from '@/utils/event-interval';
import { isOutOfTown } from '@/utils/event-locality';

/** Lifecycle of an event relative to `now` — the axis of the Discover feed. */
export type FeedTier = 'upcoming' | 'ongoing' | 'past';

/** Feed bands, in feed order: live programme, then out-of-town, then long fixtures. */
export type FeedBand = 'programme' | 'outOfTown' | 'longRunning';

const TIER_ORDER: Record<FeedTier, number> = { upcoming: 0, ongoing: 1, past: 2 };

const BAND_ORDER: Record<FeedBand, number> = {
  programme: 0,
  outOfTown: 1,
  longRunning: 2,
};

/** Where an event sits in the user's timeline: not started / running now / over. */
export function feedTier(event: StockholmEvent, now: Date): FeedTier {
  const { startMs, endMs } = eventInterval(event);
  if (startMs > now.getTime()) return 'upcoming';
  return endMs >= now.getTime() ? 'ongoing' : 'past';
}

/**
 * Which band an event belongs to. Bands cut across tiers and always win over
 * them: a band-1 long-running event sorts below every band-0 event, even a
 * dying-tonight one.
 */
export function feedBand(event: StockholmEvent, now: Date): FeedBand {
  if (isOutOfTown(event)) return 'outOfTown';
  if (isLongRunning(event, now)) return 'longRunning';
  return 'programme';
}

/**
 * Final Discover-feed order, date-first per product spec: everything not yet
 * started (soonest first), then what is running right now ordered by how soon
 * it ENDS — an event dying tonight must surface above a months-long run —
 * then the recently ended. Within a band: featured leads, quality breaks
 * date ties, id keeps the order deterministic. Pure and side-effect free so
 * the backend can reuse it verbatim.
 */
export function orderFeed(events: readonly StockholmEvent[], now: Date): StockholmEvent[] {
  const decorated = events.map((event) => {
    const { startMs, endMs } = eventInterval(event);
    const tier = feedTier(event, now);
    return {
      event,
      band: BAND_ORDER[feedBand(event, now)],
      tier: TIER_ORDER[tier],
      // Ongoing events compete on their end date; past ones run most recent
      // first. Negating folds both into the one ascending comparator.
      sortMs: tier === 'ongoing' ? endMs : tier === 'past' ? -startMs : startMs,
    };
  });
  decorated.sort((a, b) => {
    if (a.band !== b.band) return a.band - b.band;
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.event.isFeatured !== b.event.isFeatured) return a.event.isFeatured ? -1 : 1;
    if (a.sortMs !== b.sortMs) return a.sortMs - b.sortMs;
    if (b.event.qualityScore !== a.event.qualityScore) {
      return b.event.qualityScore - a.event.qualityScore;
    }
    return a.event.id.localeCompare(b.event.id);
  });
  return decorated.map(({ event }) => event);
}

/**
 * Featured-first ranking by soonest start — used for the featured carousel.
 * Same signal order as `orderFeed` within a band.
 */
export function rankEvents(events: readonly StockholmEvent[]): StockholmEvent[] {
  return [...events].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if (isOutOfTown(a) !== isOutOfTown(b)) return isOutOfTown(a) ? 1 : -1;
    const dateDelta = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    if (dateDelta !== 0) return dateDelta;
    if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
    return a.id.localeCompare(b.id);
  });
}

/** Featured events only, ordered by soonest — used by the Discover carousel. */
export function featuredEvents(events: readonly StockholmEvent[]): StockholmEvent[] {
  return rankEvents(events.filter((event) => event.isFeatured));
}
