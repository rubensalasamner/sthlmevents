import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { stockholmLocalToUtcIso } from '../../shared/time.js';
import { mapTicketmasterCategory, primaryClassification } from './category-map.js';
import type { TmDateStart, TmEvent, TmImage, TmPriceRange } from './types.js';

export const TICKETMASTER_SOURCE = 'ticketmaster';
const DEFAULT_QUALITY_SCORE = 55;

/**
 * Resolves the start instant. Ticketmaster's UTC `dateTime` wins when a real
 * time is known; otherwise the local date is treated as a Stockholm-local
 * all-day event. Returns undefined when the date itself is TBD.
 */
export function resolveTicketmasterStart(start: TmDateStart | undefined): string | undefined {
  if (!start) return undefined;

  const timeUnknown = Boolean(start.timeTBA || start.noSpecificTime);
  if (start.dateTime && !timeUnknown) {
    return new Date(start.dateTime).toISOString();
  }
  if (start.localDate) {
    return stockholmLocalToUtcIso(start.localDate, timeUnknown ? undefined : start.localTime?.slice(0, 5));
  }
  return undefined;
}

function resolvePriceSek(ranges: readonly TmPriceRange[] | undefined): number | undefined {
  const sek = (ranges ?? []).find(
    (range) => range.currency === 'SEK' && typeof range.min === 'number',
  );
  return sek?.min;
}

/** Picks the widest available image. */
function pickImage(images: readonly TmImage[] | undefined): string | undefined {
  if (!images?.length) return undefined;
  return [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url;
}

function toCoordinate(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Pure transform: one Discovery event -> shared `StockholmEvent`. Assumes a
 * resolvable start (the adapter filters the rest). Price is only mapped when
 * quoted in SEK; other currencies are left unknown.
 */
export function mapTicketmasterEvent(raw: TmEvent): StockholmEvent {
  const startsAt = resolveTicketmasterStart(raw.dates?.start);
  if (!startsAt) {
    throw new Error(`Ticketmaster event ${raw.id} has no resolvable start date`);
  }

  const classification = primaryClassification(raw.classifications);
  const category = mapTicketmasterCategory(classification);
  const venue = raw._embedded?.venues?.[0];

  return {
    id: `${TICKETMASTER_SOURCE}:${raw.id}`,
    title: raw.name,
    description: raw.info ?? '',
    category,
    imageUrl: pickImage(raw.images) || fallbackImageFor(category),
    startsAt,
    venue: {
      name: venue?.name?.trim() || 'Stockholm',
      address: venue?.address?.line1 ?? '',
      district: venue?.city?.name?.trim() || 'Stockholm',
      latitude: toCoordinate(venue?.location?.latitude),
      longitude: toCoordinate(venue?.location?.longitude),
    },
    priceSek: resolvePriceSek(raw.priceRanges),
    ticketUrl: raw.url,
    organizer:
      raw.promoter?.name?.trim() ||
      raw._embedded?.attractions?.[0]?.name?.trim() ||
      venue?.name?.trim() ||
      'Ticketmaster',
    source: TICKETMASTER_SOURCE,
    sourceId: raw.id,
    sourceUrl: raw.url,
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
