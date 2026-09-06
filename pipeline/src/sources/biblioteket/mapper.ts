import { stockholmLocalToUtcIso } from '../../shared/time.js';
import { fallbackImageFor } from '../../shared/images.js';
import type { StockholmEvent } from '../../shared/event.js';
import { mapBibCategory } from './category-map.js';
import type { BibEvent } from './types.js';

export const BIBLIOTEKET_SOURCE = 'biblioteket';
const SITE_URL = 'https://biblioteket.stockholm.se';
const DEFAULT_QUALITY_SCORE = 50;

/**
 * `dateTime.startDate` arrives as Swedish long-form
 * ("onsdag 2 september 2026") from the API's Swedish locale.
 */
const MONTHS: Record<string, number> = {
  januari: 1, februari: 2, mars: 3, april: 4, maj: 5, juni: 6,
  juli: 7, augusti: 8, september: 9, oktober: 10, november: 11, december: 12,
};

export function parseBibDate(swedishDate: string): string | null {
  const match = swedishDate.match(/(\d{1,2})\s+([a-zåäö]+)\s+(\d{4})/i);
  if (!match) return null;
  const [, dayPart, monthName, yearPart] = match;
  if (!dayPart || !monthName || !yearPart) return null;
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) return null;
  return `${yearPart}-${String(month).padStart(2, '0')}-${String(dayPart).padStart(2, '0')}`;
}

export function mapBibEvent(raw: BibEvent): StockholmEvent | null {
  const date = parseBibDate(raw.dateTime.startDate);
  if (!date) return null;

  // Multi-day happenings (reading challenges etc.) span from start 00:00 to
  // stop day 23:59; single-day events get their clock times. Drop-in events
  // often have start==stop with wide times — that's still a valid interval.
  const hasClockTimes = Boolean(raw.dateTime.startTime);
  const multiDay = raw.dateTime.stopDate !== raw.dateTime.startDate;
  const stopDate = parseBibDate(raw.dateTime.stopDate) ?? date;

  const startsAt = stockholmLocalToUtcIso(date, hasClockTimes ? raw.dateTime.startTime : undefined);
  const endsAt =
    multiDay || !hasClockTimes
      ? stockholmLocalToUtcIso(stopDate, '23:59')
      : raw.dateTime.stopTime
        ? stockholmLocalToUtcIso(stopDate, raw.dateTime.stopTime)
        : undefined;

  const title = raw.title.trim();
  const preamble = (raw.description?.preamble ?? '').trim();
  const venue = (raw.library ?? '').trim() || 'Stockholms stadsbibliotek';
  const category = mapBibCategory(title, preamble);

  return {
    id: `biblioteket:${raw.id}`,
    title,
    description: preamble,
    category,
    imageUrl: raw.image?.url?.trim() || fallbackImageFor(category),
    startsAt,
    endsAt,
    venue: {
      name: venue,
      address: (raw.location ?? '').trim(),
      district: 'Stockholm',
    },
    // Library events are free; where booking exists it is via the event page.
    priceSek: 0,
    ticketUrl: undefined,
    organizer: 'Stockholms stadsbibliotek',
    source: BIBLIOTEKET_SOURCE,
    sourceId: String(raw.id),
    sourceUrl: `${SITE_URL}/evenemang/${raw.eventSlugId}`,
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
