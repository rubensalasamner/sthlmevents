import type { StockholmEvent } from '@/types/event';
import { overlapsWindow } from '@/utils/event-interval';

export const DATE_RANGES = ['all', 'today', 'weekend', 'week'] as const;

export type DateRangeValue = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRangeValue, string> = {
  all: 'Allt',
  today: 'Idag',
  weekend: 'Helgen',
  week: 'Veckan',
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
export function stockholmTzOffsetMs(instant: Date): number {
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
  return new Date(civilUtc - stockholmTzOffsetMs(new Date(civilUtc)));
}

/**
 * Stockholm wall-clock on the civil day `dayOffset` from `now`'s Stockholm
 * date, at `hour`:`minute`. Prefer this over `midnight + N hours` — fixed
 * hour deltas land wrong across DST transitions.
 */
export function stockholmLocalDateTime(
  dayOffset: number,
  hour: number,
  minute: number,
  now: Date,
): Date {
  const [year, month, day] = localDate.format(now).split('-').map(Number);
  const civilUtc = Date.UTC(year, month - 1, day + dayOffset, hour, minute);
  return new Date(civilUtc - stockholmTzOffsetMs(new Date(civilUtc)));
}

/** Inclusive-start, exclusive-end window for a range, relative to `now`. */
export function windowFor(range: DateRangeValue, now: Date): { from: Date; to: Date } | null {
  switch (range) {
    case 'today':
      return { from: stockholmMidnight(0, now), to: stockholmMidnight(1, now) };
    case 'week':
      return { from: stockholmMidnight(0, now), to: stockholmMidnight(7, now) };
    case 'weekend': {
      // Friday 00:00 → Monday 00:00 in the city's calendar. Inside the
      // weekend the window starts today so days already over don't resurface.
      const weekday = stockholmWeekday(now);
      const daysUntilMonday = weekday === 0 ? 1 : 8 - weekday;
      const from = isWeekendDay(weekday) ? 0 : daysUntilMonday - 3;
      return { from: stockholmMidnight(from, now), to: stockholmMidnight(daysUntilMonday, now) };
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

/**
 * Stockholm weekday as JS `Date#getUTCDay` numbers (0=Sun … 6=Sat), using the
 * city's civil calendar — not the phone's timezone.
 */
export function stockholmWeekday(now: Date): number {
  const [year, month, day] = localDate.format(now).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Stockholm civil date as YYYY-MM-DD. */
export function stockholmDateKey(now: Date): string {
  return localDate.format(now);
}

/** Fri / Sat / Sun as `getUTCDay` numbers. */
function isWeekendDay(weekday: number): boolean {
  return weekday === 0 || weekday >= 5;
}

/**
 * Contextual Home default: Fri–Sun open on the weekend, Mon–Thu on today —
 * both windows always include tonight.
 */
export function defaultDateRange(now: Date = new Date()): DateRangeValue {
  return isWeekendDay(stockholmWeekday(now)) ? 'weekend' : 'today';
}

/** Section / hero copy for the active date window. */
export function dateRangeHeading(range: DateRangeValue): string {
  switch (range) {
    case 'today':
      return 'Today';
    case 'weekend':
      return 'This weekend';
    case 'week':
      return 'This week';
    case 'all':
    default:
      return 'All events';
  }
}

/** Short window description for the filter sheet's date cards. */
export function dateRangeHint(range: DateRangeValue): string {
  switch (range) {
    case 'today':
      return 'Until midnight';
    case 'weekend':
      return 'Fri → Sun';
    case 'week':
      return 'Next 7 days';
    case 'all':
    default:
      return 'Everything ahead';
  }
}
