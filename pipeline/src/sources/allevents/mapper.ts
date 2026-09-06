import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { mapAlleventsCategory } from './category-map.js';
import type { AeEvent } from './types.js';

export const ALLEVENTS_SOURCE = 'allevents';
/** Aggregator content is lower-trust than first-party sources. */
const DEFAULT_QUALITY_SCORE = 40;

export function epochToIso(seconds: string | undefined): string | undefined {
  if (!seconds) return undefined;
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString() : undefined;
}

function toCoordinate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : undefined;
}

/**
 * Pure transform: one allevents.in entry -> shared `StockholmEvent`. Times are
 * epoch seconds; coordinates and image ship inline. Price isn't exposed, so
 * `priceSek` is left unknown and `ticketUrl` prefers an explicit ticket link,
 * falling back to the event page. Callers must pre-filter to entries with a
 * resolvable start time (see `isMappableAlleventsEvent`).
 */
export function mapAlleventsEvent(raw: AeEvent): StockholmEvent {
  const category = mapAlleventsCategory(raw);
  const startsAt = epochToIso(raw.start_time)!;
  const ticketUrl = raw.tickets?.ticket_url || raw.event_url;

  return {
    id: `${ALLEVENTS_SOURCE}:${raw.event_id}`,
    title: raw.eventname_raw || raw.eventname,
    description: raw.short_description?.trim() ?? '',
    category,
    imageUrl: raw.banner_url || raw.thumb_url_large || raw.thumb_url || fallbackImageFor(category),
    startsAt,
    endsAt: epochToIso(raw.end_time),
    venue: {
      name: raw.location || raw.venue?.full_address || 'Stockholm',
      address: raw.venue?.street ?? '',
      district: raw.venue?.city || 'Stockholm',
      latitude: toCoordinate(raw.venue?.latitude),
      longitude: toCoordinate(raw.venue?.longitude),
    },
    priceSek: undefined,
    ticketUrl,
    organizer: raw.organizer?.name?.trim() || 'allevents.in',
    source: ALLEVENTS_SOURCE,
    sourceId: raw.event_id,
    sourceUrl: raw.event_url,
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
