import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { stockholmLocalToUtcIso } from '../../shared/time.js';
import { mapEventbriteCategory } from './category-map.js';
import { eventbriteIdFromUrl } from './parse.js';
import type { EbEvent, EbPlace } from './types.js';

export const EVENTBRITE_SOURCE = 'eventbrite';
const DEFAULT_QUALITY_SCORE = 45;

function isPlace(location: EbEvent['location']): location is EbPlace {
  return location?.['@type'] === 'Place';
}

function toCoordinate(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * List-page dates are date-only, so events are treated as Stockholm-local
 * all-day. A differing `endDate` yields a multi-day event ending at 23:59;
 * a same-day range carries no `endsAt`.
 */
function resolveTimes(raw: EbEvent): { startsAt: string; endsAt?: string } {
  const startsAt = stockholmLocalToUtcIso(raw.startDate);
  if (raw.endDate && raw.endDate !== raw.startDate) {
    return { startsAt, endsAt: stockholmLocalToUtcIso(raw.endDate, '23:59') };
  }
  return { startsAt };
}

/**
 * Pure transform: one Eventbrite JSON-LD event -> shared `StockholmEvent`.
 * Source gaps handled here: no price (`priceSek` undefined), no organizer
 * (venue name is the best proxy), no start time (all-day).
 */
export function mapEventbriteEvent(raw: EbEvent): StockholmEvent {
  const category = mapEventbriteCategory(raw.name, raw.description ?? '');
  const { startsAt, endsAt } = resolveTimes(raw);
  const sourceId = eventbriteIdFromUrl(raw.url) ?? raw.url;
  const place = isPlace(raw.location) ? raw.location : undefined;

  return {
    id: `${EVENTBRITE_SOURCE}:${sourceId}`,
    title: raw.name,
    description: raw.description ?? '',
    category,
    imageUrl: raw.image || fallbackImageFor(category),
    startsAt,
    endsAt,
    venue: {
      name: place?.name || raw.location?.name || 'Stockholm',
      address: place?.address?.streetAddress ?? '',
      district: place?.address?.addressLocality || 'Stockholm',
      latitude: toCoordinate(place?.geo?.latitude),
      longitude: toCoordinate(place?.geo?.longitude),
    },
    priceSek: undefined,
    ticketUrl: raw.url,
    organizer: place?.name || 'Eventbrite',
    source: EVENTBRITE_SOURCE,
    sourceId,
    sourceUrl: raw.url,
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
