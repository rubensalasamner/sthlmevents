import type { AffinitySignal, AffinitySnapshot } from '@/data/affinity-storage';
import { EVENT_CATEGORIES, type EventCategory, type StockholmEvent } from '@/types/event';
import { stockholmWeekday } from '@/utils/date-range';
import { distanceKm, eventPoint, type GeoPoint } from '@/utils/geo';

const CATEGORY_SET = new Set<string>(EVENT_CATEGORIES);

/** ~21-day half-life — recent engagement dominates without locking forever. */
export const AFFINITY_HALF_LIFE_MS = 21 * 24 * 60 * 60 * 1000;

const SIGNAL_WEIGHT: Record<AffinitySignal['kind'], number> = {
  open: 1,
  favorite: 4,
  follow_venue: 6,
  follow_organizer: 6,
};

export function foldAffinityKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function decayedWeight(signal: AffinitySignal, nowMs: number): number {
  const age = Math.max(0, nowMs - signal.at);
  return SIGNAL_WEIGHT[signal.kind] * Math.pow(0.5, age / AFFINITY_HALF_LIFE_MS);
}

/**
 * Per-key affinity totals after exponential decay. Keys are category ids or
 * folded venue/organizer names (same fold as follow lists).
 */
export function scoreAffinityKeys(
  snapshot: AffinitySnapshot,
  now: Date = new Date(),
): Map<string, number> {
  const nowMs = now.getTime();
  const scores = new Map<string, number>();
  for (const signal of snapshot.signals) {
    scores.set(signal.key, (scores.get(signal.key) ?? 0) + decayedWeight(signal, nowMs));
  }
  // Active follows keep a floor even if the follow signal aged out of the list.
  for (const venue of snapshot.followedVenues) {
    scores.set(venue, Math.max(scores.get(venue) ?? 0, SIGNAL_WEIGHT.follow_venue));
  }
  for (const organizer of snapshot.followedOrganizers) {
    scores.set(organizer, Math.max(scores.get(organizer) ?? 0, SIGNAL_WEIGHT.follow_organizer));
  }
  return scores;
}

export function categoryAffinityMap(
  keyScores: ReadonlyMap<string, number>,
): Map<EventCategory, number> {
  const out = new Map<EventCategory, number>();
  for (const [key, score] of keyScores) {
    if (!CATEGORY_SET.has(key)) continue;
    out.set(key as EventCategory, score);
  }
  return out;
}

/**
 * Soft preference for an event from learned affinity + follows.
 * Higher is better. Scale is roughly 0–20 for typical users.
 */
export function eventAffinityScore(
  event: StockholmEvent,
  keyScores: ReadonlyMap<string, number>,
  snapshot: AffinitySnapshot,
): number {
  const category = keyScores.get(event.category) ?? 0;
  const venueKey = foldAffinityKey(event.venue.name);
  const organizerKey = foldAffinityKey(event.organizer);
  const venue =
    (venueKey ? keyScores.get(venueKey) ?? 0 : 0) +
    (venueKey && snapshot.followedVenues.includes(venueKey) ? 2 : 0);
  const organizer =
    (organizerKey ? keyScores.get(organizerKey) ?? 0 : 0) +
    (organizerKey && snapshot.followedOrganizers.includes(organizerKey) ? 2 : 0);
  return category + venue + organizer;
}

/** Stockholm local hour 0–23. */
export function stockholmHour(now: Date): number {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Stockholm',
      hour: 'numeric',
      hour12: false,
    }).format(now),
  );
  return Number.isFinite(hour) ? hour % 24 : 12;
}

/**
 * Soft time-of-day / weekday prior. Never a filter — small additive boost.
 */
export function timeContextBoost(category: EventCategory, now: Date): number {
  const hour = stockholmHour(now);
  const weekday = stockholmWeekday(now); // 0=Sun … 6=Sat
  const isWeekend = weekday === 0 || weekday === 6;
  const isFriSatEve = (weekday === 5 || weekday === 6) && hour >= 17;
  const isWeekendDay = isWeekend && hour < 17;
  const isWeekdayLunch = weekday >= 1 && weekday <= 5 && hour >= 11 && hour < 14;

  if (isFriSatEve && (category === 'nightlife' || category === 'music' || category === 'comedy')) {
    return 1.5;
  }
  if (
    isWeekendDay &&
    (category === 'market' ||
      category === 'family' ||
      category === 'popup' ||
      category === 'art' ||
      category === 'theatre')
  ) {
    return 1.2;
  }
  if (isWeekdayLunch && category === 'food') return 1;
  return 0;
}

/**
 * Soft proximity when GPS is known but Near me is not filtering.
 * Closer → higher. Events without coords score 0.
 */
export function softDistanceBoost(event: StockholmEvent, origin: GeoPoint | null | undefined): number {
  if (!origin) return 0;
  const point = eventPoint(event);
  if (!point) return 0;
  const km = distanceKm(origin, point);
  if (km <= 2) return 3;
  if (km <= 5) return 1.5;
  if (km <= 10) return 0.5;
  return 0;
}

/**
 * Combined soft preference used inside `orderFeed`. Explicit vibes dominate;
 * affinity / time / distance are secondary.
 */
export function preferenceScore(
  event: StockholmEvent,
  options: {
    preferredCategories?: ReadonlySet<EventCategory>;
    keyScores?: ReadonlyMap<string, number>;
    snapshot?: AffinitySnapshot;
    userLocation?: GeoPoint | null;
    now: Date;
  },
): number {
  const preferred = options.preferredCategories?.has(event.category) ? 100 : 0;
  const affinity = options.keyScores
    ? Math.min(
        40,
        eventAffinityScore(event, options.keyScores, options.snapshot ?? { signals: [], followedVenues: [], followedOrganizers: [] }) *
          3,
      )
    : 0;
  const time = timeContextBoost(event.category, options.now) * 8;
  const distance = softDistanceBoost(event, options.userLocation) * 5;
  return preferred + affinity + time + distance;
}

/**
 * Greedy diversity pass: avoid long same-category runs within the already
 * ranked list, while preserving relative order as much as possible.
 */
export function diversifyFeed(
  events: readonly StockholmEvent[],
  maxConsecutive = 2,
): StockholmEvent[] {
  if (events.length <= maxConsecutive || maxConsecutive < 1) return [...events];

  const remaining = [...events];
  const out: StockholmEvent[] = [];

  while (remaining.length > 0) {
    let run = 0;
    const lastCat = out.length > 0 ? out[out.length - 1]!.category : null;
    if (lastCat) {
      for (let i = out.length - 1; i >= 0 && out[i]!.category === lastCat; i -= 1) run += 1;
    }

    let pickIndex = 0;
    if (run >= maxConsecutive) {
      const alt = remaining.findIndex((event) => event.category !== lastCat);
      if (alt >= 0) pickIndex = alt;
    }

    const [picked] = remaining.splice(pickIndex, 1);
    if (picked) out.push(picked);
  }

  return out;
}
