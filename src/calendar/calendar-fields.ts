import type { StockholmEvent } from '@/types/event';
import { venueLine } from '@/utils/format';

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
export const STOCKHOLM_TZ = 'Europe/Stockholm';

/** End time: explicit `endsAt`, otherwise start + 2 hours. */
export function calendarEndDate(event: Pick<StockholmEvent, 'startsAt' | 'endsAt'>): Date {
  if (event.endsAt) {
    const end = new Date(event.endsAt);
    if (!Number.isNaN(end.getTime()) && end.getTime() > new Date(event.startsAt).getTime()) {
      return end;
    }
  }
  return new Date(new Date(event.startsAt).getTime() + DEFAULT_DURATION_MS);
}

export function calendarNotes(event: StockholmEvent): string {
  const parts = [event.description?.trim(), event.ticketUrl ?? event.sourceUrl].filter(Boolean);
  return parts.join('\n\n');
}

export function calendarLocation(event: StockholmEvent): string {
  return venueLine([event.venue.name, event.venue.address, event.venue.district]);
}

/** Google Calendar template URL — used on web where the native calendar API is absent. */
export function googleCalendarUrl(event: StockholmEvent): string {
  const start = new Date(event.startsAt);
  const end = calendarEndDate(event);
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: calendarNotes(event),
    location: calendarLocation(event),
    ctz: STOCKHOLM_TZ,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
