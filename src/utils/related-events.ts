import type { StockholmEvent } from '@/types/event';
import { collapseSeries, titleVenueKey } from '@/utils/collapse-series';
import { stockholmMidnight } from '@/utils/date-range';
import { eventInterval, LONG_RUNNING_MS } from '@/utils/event-interval';
import { distanceKm, eventPoint } from '@/utils/geo';

export type RelatedStrategy = {
  id: string;
  title: (event: StockholmEvent) => string;
  /** Candidates in display order; the current event's own series is already excluded. */
  pick: (event: StockholmEvent, candidates: readonly StockholmEvent[], now: Date) => StockholmEvent[];
};

export type RelatedRail = {
  id: string;
  title: string;
  events: StockholmEvent[];
  /** More than one category on the rail — tiles need a badge. */
  mixed: boolean;
};

const NEARBY_RADIUS_KM = 1.5;
const RAIL_LIMIT = 10;

function fold(value: string): string {
  return value.trim().toLowerCase();
}

export const sameVenue: RelatedStrategy = {
  id: 'venue',
  title: (event) => `More at ${event.venue.name}`,
  pick: (event, candidates) => {
    const venue = fold(event.venue.name);
    if (!venue) return [];
    return candidates.filter((other) => fold(other.venue.name) === venue);
  },
};

/** Skipped when the organizer is the venue — the venue rail already covers it. */
export const sameOrganizer: RelatedStrategy = {
  id: 'organizer',
  title: (event) => `More from ${event.organizer}`,
  pick: (event, candidates) => {
    const organizer = fold(event.organizer);
    if (!organizer || organizer === fold(event.venue.name)) return [];
    return candidates.filter((other) => fold(other.organizer) === organizer);
  },
};

/**
 * Events within walking distance on the day you'd attend — today for
 * something already running. Month-plus runs are left out so a long
 * exhibition doesn't count as "same day".
 */
export const sameDayNearby: RelatedStrategy = {
  id: 'nearby',
  title: () => 'Same day nearby',
  pick: (event, candidates, now) => {
    const origin = eventPoint(event);
    if (!origin) return [];
    const anchor = new Date(Math.max(eventInterval(event).startMs, now.getTime()));
    const dayStart = stockholmMidnight(0, anchor).getTime();
    const dayEnd = stockholmMidnight(1, anchor).getTime();

    return candidates
      .flatMap((other) => {
        const point = eventPoint(other);
        if (!point) return [];
        const { startMs, endMs } = eventInterval(other);
        if (endMs - startMs >= LONG_RUNNING_MS) return [];
        if (startMs >= dayEnd || endMs < dayStart) return [];
        const km = distanceKm(origin, point);
        return km <= NEARBY_RADIUS_KM ? [{ other, km }] : [];
      })
      .sort((a, b) => a.km - b.km)
      .map(({ other }) => other);
  },
};

export const RELATED_STRATEGIES: readonly RelatedStrategy[] = [
  sameVenue,
  sameOrganizer,
  sameDayNearby,
];

/**
 * Rails for the detail screen. Each strategy sees the feed minus the event's
 * own series; rails never repeat a series an earlier rail already showed.
 */
export function relatedRails(
  event: StockholmEvent,
  all: readonly StockholmEvent[],
  now: Date,
  strategies: readonly RelatedStrategy[] = RELATED_STRATEGIES,
): RelatedRail[] {
  const ownSeries = titleVenueKey(event);
  const candidates = all.filter(
    (other) =>
      other.id !== event.id &&
      titleVenueKey(other) !== ownSeries &&
      eventInterval(other).endMs >= now.getTime(),
  );
  const shown = new Set<string>();
  const rails: RelatedRail[] = [];

  for (const strategy of strategies) {
    const fresh = strategy
      .pick(event, candidates, now)
      .filter((other) => !shown.has(titleVenueKey(other)));
    const picked = collapseSeries(fresh, { now }).events.slice(0, RAIL_LIMIT);
    if (picked.length === 0) continue;
    for (const other of picked) shown.add(titleVenueKey(other));
    rails.push({
      id: strategy.id,
      title: strategy.title(event),
      events: picked,
      mixed: new Set(picked.map((other) => other.category)).size > 1,
    });
  }
  return rails;
}
