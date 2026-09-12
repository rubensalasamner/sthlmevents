import type { StockholmEvent } from '@/types/event';
import { overlapsWindow } from '@/utils/event-interval';

export const DATE_RANGES = ['all', 'today', 'weekend', 'week'] as const;

export type DateRangeValue = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRangeValue, string> = {
  all: 'Any time',
  today: 'Today',
  weekend: 'This weekend',
  week: 'This week',
};

// "Today" is a day in the city's calendar, not the phone's: a user in
// Berlin on Sunday 00:30 must still see Friday-night events as past.
const STOCKHOLM_TZ = 'Europe/Stockholm';

const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: STOCKHOLM_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Offset (ms) between UTC and Stockholm wall-clock at the given instant. */
function tzOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STOCKHOLM_TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - instant.getTime();
}

/**
 * UTC instant of Stockholm-local midnight, `dayOffset` civil days from
 * Stockholm's "today". DST-exact: the offset is read for the target date, so
 * the spring-forward weekend yields 23h and autumn 25h day windows.
 */
export function stockholmMidnight(dayOffset: number, now: Date): Date {
  const [year, month, day] = localDate.format(now).split('-').map(Number);
  const civilUtc = Date.UTC(year, month - 1, day + dayOffset);
  return new Date(civilUtc - tzOffsetMs(new Date(civilUtc)));
}

/** Inclusive-start, exclusive-end window for a range, relative to `now`. */
export function windowFor(range: DateRangeValue, now: Date): { from: Date; to: Date } | null {
  switch (range) {
    case 'today':
      return { from: stockholmMidnight(0, now), to: stockholmMidnight(1, now) };
    case 'week':
      return { from: stockholmMidnight(0, now), to: stockholmMidnight(7, now) };
    case 'weekend': {
      // Saturday 00:00 → Monday 00:00 of the upcoming weekend, in the city's
      // calendar: on a Stockholm Saturday/Sunday, "this weekend" is the
      // weekend already in progress (the old `(6 - day + 7) % 7` math using
      // the phone's weekday pushed Sunday users to next weekend).
      const [year, month, day] = localDate.format(now).split('-').map(Number);
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      // On a Stockholm Sunday the weekend in progress started yesterday;
      // any other day points at the upcoming Saturday.
      const daysUntilSaturday = weekday === 0 ? -1 : (6 - weekday) % 7;
      const saturday = stockholmMidnight(daysUntilSaturday, now);
      return { from: saturday, to: stockholmMidnight(daysUntilSaturday + 2, now) };
    }
    case 'all':
    default:
      return null;
  }
}

export type DateRangeMatch = {
  /** Events that start inside the window — the primary "what's on" list. */
  primary: StockholmEvent[];
  /**
   * Events that merely span the window (started earlier, still live) —
   * shown after the primary list, flagged ongoing by the UI.
   */
  secondary: StockholmEvent[];
};

/**
 * Splits events by a date range into "starts here" vs "carries over". A range
 * matches when the event's interval overlaps the window (inclusive start,
 * exclusive end); events that *start* inside it rank above ones merely in
 * progress, so yesterday-late-night and running-exhibition entries never crowd
 * out the day's own openings.
 */
export function splitByDateRange(
  events: readonly StockholmEvent[],
  range: DateRangeValue,
  now: Date = new Date(),
): DateRangeMatch {
  const window = windowFor(range, now);
  if (!window) return { primary: [...events], secondary: [] };

  const primary: StockholmEvent[] = [];
  const secondary: StockholmEvent[] = [];
  for (const event of events) {
    const startMs = new Date(event.startsAt).getTime();
    const startsInside = startMs >= window.from.getTime() && startMs < window.to.getTime();
    if (startsInside) {
      primary.push(event);
    } else if (overlapsWindow(event, window)) {
      secondary.push(event);
    }
  }
  return { primary, secondary };
}

export function filterByDateRange(
  events: readonly StockholmEvent[],
  range: DateRangeValue,
  now: Date = new Date(),
): StockholmEvent[] {
  const { primary, secondary } = splitByDateRange(events, range, now);
  return [...primary, ...secondary];
}
