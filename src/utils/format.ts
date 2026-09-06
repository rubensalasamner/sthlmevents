import type { EventCategory, StockholmEvent } from '@/types/event';
import { isOngoing } from '@/utils/event-interval';

// Pin display to the city's timezone: an 19:00 Stockholm gig must show as
// 19:00 even on a phone set to Berlin or New York.
const STOCKHOLM_TZ = 'Europe/Stockholm';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: STOCKHOLM_TZ,
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: STOCKHOLM_TZ,
});

export function formatEventDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

/**
 * "When" line for cards/detail: one-shot events show the date (plus time range
 * when known); a running event whose start already passed shows that it is
 * ongoing and when it ends, instead of a confusing past date.
 */
export function formatEventWhen(event: StockholmEvent, now: Date = new Date()): string {
  if (!isOngoing(event, now)) {
    const start = formatEventDate(event.startsAt);
    return event.endsAt && !sameLocalDay(event.startsAt, event.endsAt)
      ? `${start} – ${formatEventDate(event.endsAt)}`
      : start;
  }
  return event.endsAt ? `Ongoing · until ${formatEventDate(event.endsAt)}` : 'Ongoing';
}

function sameLocalDay(a: string, b: string): boolean {
  return formatEventDate(a) === formatEventDate(b);
}

export function formatEventTimeRange(event: StockholmEvent): string {
  const start = timeFormatter.format(new Date(event.startsAt));
  if (!event.endsAt) return start;
  return `${start} – ${timeFormatter.format(new Date(event.endsAt))}`;
}

export function formatPrice(priceSek: number | undefined): string {
  if (priceSek === undefined) return 'See details';
  return priceSek === 0 ? 'Free' : `${priceSek} kr`;
}

/**
 * Outbound CTA label. Sources whose page needs a (free) account to act —
 * RSVP, registration — say so; plain ticket links keep the purchase framing.
 */
export function ticketCtaLabel(event: Pick<StockholmEvent, 'requiresAccount' | 'priceSek'>): string {
  if (event.requiresAccount) return 'View on organizer site';
  if (event.priceSek === 0) return 'Event page';
  return 'Get tickets';
}

/** Joins non-empty parts with ", " — drops blanks instead of printing "undefined"/dangling commas. */
export function venueLine(parts: ReadonlyArray<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(', ');
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  music: 'Music',
  art: 'Art',
  food: 'Food',
  sports: 'Sports',
  theatre: 'Theatre',
  nightlife: 'Nightlife',
  family: 'Family',
  shopping: 'Shopping',
  market: 'Market',
  popup: 'Pop-up',
  comedy: 'Comedy',
  other: 'Other',
};

export function formatCategory(category: EventCategory): string {
  return CATEGORY_LABELS[category];
}

const SOURCE_LABELS: Record<string, string> = {
  allevents: 'allevents.in',
  biblioteket: 'Stockholms stadsbibliotek',
  'evenemangskollen': 'Evenemangskollen',
  eventbrite: 'Eventbrite',
  kulturhuset: 'Kulturhuset',
  luma: 'Luma',
  loppiskartan: 'loppiskartan.se',
  meetup: 'Meetup',
  'resident-advisor': 'Resident Advisor',
  ticketmaster: 'Ticketmaster',
  'visit-stockholm': 'Visit Stockholm',
};

/** Human-readable name for a pipeline source id; falls back to the raw id. */
export function formatSource(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
