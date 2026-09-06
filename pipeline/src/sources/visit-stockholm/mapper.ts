import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { stockholmLocalToUtcIso } from '../../shared/time.js';
import { mapVisitStockholmCategory } from './category-map.js';
import type { VsEvent, VsLocalized } from './types.js';

export const VISIT_STOCKHOLM_SOURCE = 'visit-stockholm';
// Visit Stockholm has no stable per-event web page (events aren't in the
// sitemap), so the canonical record is the API resource itself. User-facing
// links should use `ticketUrl` (the organizer's own site).
const EVENT_API_BASE = 'https://api.visitstockholm.com/api/public-v1/events/';
const DEFAULT_QUALITY_SCORE = 50;

function pickText(localized: VsLocalized | undefined): string {
  if (!localized) return '';
  return localized.en?.trim() || localized.sv?.trim() || '';
}

/**
 * Derives start/end instants. An event without a start time is all-day: its
 * interval covers the whole local start day (`endsAt` 23:59) so interval-based
 * "ongoing/today" logic in the app treats it correctly; a multi-day all-day
 * event ends at local 23:59 on its end date.
 */
function resolveTimes(raw: VsEvent): { startsAt: string; endsAt?: string } {
  const startsAt = stockholmLocalToUtcIso(raw.start_date, raw.start_time);

  if (raw.end_time && raw.end_date) {
    return { startsAt, endsAt: stockholmLocalToUtcIso(raw.end_date, raw.end_time) };
  }
  if (raw.end_date && raw.end_date !== raw.start_date) {
    return { startsAt, endsAt: stockholmLocalToUtcIso(raw.end_date, '23:59') };
  }
  if (!raw.start_time) {
    return { startsAt, endsAt: stockholmLocalToUtcIso(raw.start_date, '23:59') };
  }
  return { startsAt };
}

/** Coerces nullable API text to a trimmed string (the shared venue type has non-optional fields). */
function text(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

/**
 * Pure transform: one raw Visit Stockholm event -> our shared `StockholmEvent`.
 * Documented source gaps handled here:
 *  - no image  -> category fallback (enrich with og:image later)
 *  - no price  -> `priceSek` left undefined
 *  - no district / organizer -> best-available proxies (station / venue)
 */
export function mapVisitStockholmEvent(raw: VsEvent): StockholmEvent {
  const category = mapVisitStockholmCategory(raw.categories.map((c) => c.slug));
  const { startsAt, endsAt } = resolveTimes(raw);

  return {
    id: `${VISIT_STOCKHOLM_SOURCE}:${raw.id}`,
    title: pickText(raw.title),
    description: pickText(raw.description),
    category,
    imageUrl: fallbackImageFor(category),
    startsAt,
    endsAt,
    venue: {
      name: text(raw.venue_name) || 'Stockholm',
      address: text(raw.address),
      district: text(raw.closest_station) || text(raw.city) || 'Stockholm',
      latitude: raw.location?.latitude,
      longitude: raw.location?.longitude,
    },
    priceSek: undefined,
    ticketUrl: raw.external_website_url || undefined,
    organizer: text(raw.venue_name) || 'Visit Stockholm',
    source: VISIT_STOCKHOLM_SOURCE,
    sourceId: raw.id,
    sourceUrl: `${EVENT_API_BASE}${raw.id}/`,
    updatedAt: raw.modified_at,
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
