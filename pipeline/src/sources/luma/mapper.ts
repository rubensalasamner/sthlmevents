import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { mapLumaCategory } from './category-map.js';
import type { LumaEntry, LumaTicketInfo } from './types.js';

export const LUMA_SOURCE = 'luma';
const SITE_BASE = 'https://lu.ma';
const DEFAULT_QUALITY_SCORE = 45;

function toCoordinate(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Luma's `price` shape for paid tickets is currency-ambiguous and not exposed
 * on the list contract, so only an explicitly free event maps to a price;
 * anything paid is left unknown (mirrors the Resident Advisor `cost` policy).
 */
function priceFromTicket(ticket: LumaTicketInfo | null | undefined): number | undefined {
  return ticket?.is_free === true ? 0 : undefined;
}

/**
 * Pure transform: one Luma discovery entry -> shared `StockholmEvent`.
 * `start_at`/`end_at` are already UTC instants. Coordinates are kept even when
 * the address is obfuscated (they place the pin close enough for the map). The
 * list contract has no body copy, so `description` is empty and og:image
 * enrichment can later refine the cover via `ticketUrl`.
 */
export function mapLumaEntry(entry: LumaEntry): StockholmEvent {
  const event = entry.event;
  const category = mapLumaCategory(event.name);
  const url = event.url ? `${SITE_BASE}/${event.url}` : undefined;
  const geo = event.geo_address_info ?? undefined;

  return {
    id: `${LUMA_SOURCE}:${event.api_id}`,
    title: event.name,
    description: '',
    category,
    imageUrl: event.cover_url || fallbackImageFor(category),
    startsAt: new Date(event.start_at).toISOString(),
    endsAt: event.end_at ? new Date(event.end_at).toISOString() : undefined,
    venue: {
      name: geo?.place_name || geo?.address || geo?.sublocality || geo?.city || 'Stockholm',
      address: geo?.address || geo?.full_address || '',
      district: geo?.sublocality || geo?.city || geo?.region || 'Stockholm',
      latitude: toCoordinate(event.coordinate?.latitude),
      longitude: toCoordinate(event.coordinate?.longitude),
    },
    priceSek: priceFromTicket(entry.ticket_info),
    ticketUrl: url,
    organizer: entry.hosts?.[0]?.name?.trim() || 'Luma',
    source: LUMA_SOURCE,
    sourceId: event.api_id,
    sourceUrl: url,
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
