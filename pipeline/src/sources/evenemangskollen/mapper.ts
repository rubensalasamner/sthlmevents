import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { mapEkCategory } from './category-map.js';
import type { EkRow } from './types.js';

export const EVENEMANGSKOLLEN_SOURCE = 'evenemangskollen';
const SITE_BASE = 'https://evenemangskollen.se';
const DEFAULT_QUALITY_SCORE = 50;

/**
 * Ticketing states that mean the occurrence is not a live offer anymore.
 * Cancelled events are dropped outright; ended/off-sale/paused are kept only
 * if they still make sense as content — we drop them too (they cannot be
 * attended/bought, and the calendar should not fill with them).
 */
const EXCLUDED_STATES = new Set(['cancelled', 'saleEnded', 'offsale']);

/**
 * Strips the markdown/HTML description down to readable text. Tag removal
 * leaves a space before punctuation ("musik ." <- "<em>musik</em>."); the
 * `\\s+([.,!?;:])` pass collapses that.
 */
function descriptionText(raw: EkRow): string {
  const source = raw.description_markdown ?? raw.description_html ?? '';
  return source
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_>`\[\]()]/g, '')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIso(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Pure transform: one Evenemangskollen row -> shared `StockholmEvent`.
 * Times are ISO 8601 instants. No coordinates and no price in the source —
 * coordinates come from the geocoding stage, `priceSek` stays unknown.
 */
export function mapEkEvent(raw: EkRow): StockholmEvent {
  const category = mapEkCategory(raw);
  const ticketUrl = raw.shop_url?.trim() || undefined;
  const infoUrl = raw.info_url?.trim() || undefined;

  return {
    id: `${EVENEMANGSKOLLEN_SOURCE}:${raw.id}`,
    title: raw.name,
    description: descriptionText(raw),
    category,
    imageUrl: raw.image_url?.trim() || fallbackImageFor(category),
    startsAt: toIso(raw.start_utc)!,
    endsAt: toIso(raw.end_utc),
    venue: {
      name: raw.venue_name?.trim() || 'Stockholm',
      address: raw.venue_address?.trim() ?? '',
      district: raw.venue_city?.trim() || 'Stockholm',
    },
    priceSek: undefined,
    ticketUrl,
    organizer: raw.organizer_name?.trim() || 'Evenemangskollen',
    source: EVENEMANGSKOLLEN_SOURCE,
    sourceId: raw.id,
    sourceUrl: infoUrl ?? ticketUrl ?? `${SITE_BASE}/event/${raw.id}`,
    updatedAt: new Date().toISOString(),
    isFeatured: raw.is_popular === true,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}

/** Occurrence-level gate applied before mapping. */
export function isListableEkRow(raw: EkRow): boolean {
  if (!raw.id || !raw.name || !raw.start_utc) return false;
  const state = raw.state ?? '';
  return !EXCLUDED_STATES.has(state);
}
