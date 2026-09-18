import { stockholmDateKey, stockholmMidnight } from '@/utils/date-range';
import { formatEventClock, formatEventDate } from '@/utils/format';
import { feedBand, feedTier } from '@/utils/ranking';
import type { StockholmEvent } from '@/types/event';

export type AgendaGroup = {
  id: string;
  label: string;
  events: StockholmEvent[];
};

type Bucket = {
  id: string;
  label: string;
  sortMs: number;
  events: StockholmEvent[];
};

/**
 * Groups an already-ranked feed into a night-planning agenda: happening now,
 * today's clock hours, tomorrow, later dates. Long-running fixtures sit in
 * "Still on" so they don't flood the now-bucket.
 */
export function groupAgenda(events: readonly StockholmEvent[], now: Date): AgendaGroup[] {
  const happening: StockholmEvent[] = [];
  const stillOn: StockholmEvent[] = [];
  const earlier: StockholmEvent[] = [];
  const buckets = new Map<string, Bucket>();

  const todayStamp = stockholmDateKey(now);
  const tomorrowStamp = stockholmDateKey(stockholmMidnight(1, now));

  for (const event of events) {
    const tier = feedTier(event, now);
    if (tier === 'ongoing') {
      if (feedBand(event, now) === 'programme') happening.push(event);
      else stillOn.push(event);
      continue;
    }
    if (tier === 'past') {
      earlier.push(event);
      continue;
    }

    const start = new Date(event.startsAt);
    const stamp = stockholmDateKey(start);
    if (stamp === todayStamp) {
      const clock = formatEventClock(event.startsAt);
      add(buckets, `h-${clock}`, clock, start.getTime(), event);
    } else if (stamp === tomorrowStamp) {
      add(buckets, 'tomorrow', 'Tomorrow', stockholmMidnight(1, now).getTime(), event);
    } else {
      add(buckets, stamp, formatEventDate(event.startsAt), start.getTime(), event);
    }
  }

  const groups: AgendaGroup[] = [];
  if (happening.length > 0) {
    groups.push({ id: 'now', label: 'Happening now', events: happening });
  }
  const timed = [...buckets.values()].sort((a, b) => a.sortMs - b.sortMs || a.id.localeCompare(b.id));
  for (const bucket of timed) {
    groups.push({ id: bucket.id, label: bucket.label, events: bucket.events });
  }
  if (stillOn.length > 0) {
    groups.push({ id: 'still', label: 'Still on', events: stillOn });
  }
  if (earlier.length > 0) {
    groups.push({ id: 'earlier', label: 'Earlier', events: earlier });
  }
  return groups;
}

function add(
  buckets: Map<string, Bucket>,
  id: string,
  label: string,
  sortMs: number,
  event: StockholmEvent,
): void {
  const existing = buckets.get(id);
  if (existing) {
    existing.events.push(event);
    return;
  }
  buckets.set(id, { id, label, sortMs, events: [event] });
}
