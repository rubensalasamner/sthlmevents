import type { StockholmEvent } from '@/types/event';

/**
 * Collapses recurring occurrences (same event, many dates) into one list entry:
 * an exhibition running for months should occupy one card, not one per day.
 * Runs at presentation time — the underlying snapshot keeps every occurrence,
 * so favorites and detail routes for hidden occurrences still resolve.
 *
 * Occurrences are grouped by an injectable key strategy (default: normalized
 * title + venue) and each group is represented by its earliest still-live
 * occurrence; the remaining live start times ride along as `nextDates` for the
 * "more dates" badge.
 */

export type SeriesKeyFn = (event: StockholmEvent) => string;

export type CollapseOptions = {
  /** Reference instant for "upcoming"; defaults to the current time. */
  now?: Date;
  /** Grouping strategy; default matches on normalized title + venue name. */
  keyFn?: SeriesKeyFn;
};

export type CollapseResult = {
  events: StockholmEvent[];
  /** Occurrences hidden behind representatives — the redundancy removed. */
  hiddenOccurrences: number;
};

/** Case/diacritic/punctuation-folded text so naming drift does not split a series. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Default strategy: same title at the same venue is the same series. */
export function titleVenueKey(event: StockholmEvent): string {
  return `${normalize(event.title)}|${normalize(event.venue.name)}`;
}

/** Still worth showing: currently running (endsAt covers now) or in the future. */
function isLive(event: StockholmEvent, now: Date): boolean {
  return new Date(event.endsAt ?? event.startsAt).getTime() >= now.getTime();
}

export function collapseSeries(
  events: readonly StockholmEvent[],
  { now = new Date(), keyFn = titleVenueKey }: CollapseOptions = {},
): CollapseResult {
  const groups = new Map<string, StockholmEvent[]>();
  for (const event of events) {
    const key = keyFn(event);
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }

  const collapsed: StockholmEvent[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      collapsed.push(group[0]!);
      continue;
    }

    const chronological = [...group].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || a.id.localeCompare(b.id),
    );
    // Live series: the earliest ongoing/upcoming occurrence fronts the group.
    // Fully past series: the most recent occurrence, so it sorts sensibly.
    const representative =
      chronological.find((event) => isLive(event, now)) ?? chronological[chronological.length - 1]!;
    const nextDates = chronological
      .filter((event) => event !== representative && isLive(event, now))
      .map((event) => event.startsAt);

    collapsed.push(nextDates.length > 0 ? { ...representative, nextDates } : representative);
  }

  return { events: collapsed, hiddenOccurrences: events.length - collapsed.length };
}
