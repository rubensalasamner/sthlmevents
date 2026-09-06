import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { stockholmLocalToUtcIso } from '../../shared/time.js';
import type { RaEvent } from './types.js';

export const RESIDENT_ADVISOR_SOURCE = 'resident-advisor';
const SITE_BASE = 'https://ra.co';
const DEFAULT_QUALITY_SCORE = 50;

/** Splits a `LocalDateTime` ("YYYY-MM-DDTHH:mm:ss.sss") into a UTC instant. */
export function raLocalToUtc(local: string | null | undefined): string | undefined {
  if (!local) return undefined;
  const [datePart, timePart] = local.split('T');
  if (!datePart) return undefined;
  return stockholmLocalToUtcIso(datePart, timePart?.slice(0, 5));
}

/**
 * RA's `cost` is free text (currency-ambiguous, often tiered), so only an
 * unambiguous "0"/"free" maps to a price; everything else is left unknown.
 */
export function parseRaCost(cost: string | null | undefined): number | undefined {
  if (cost == null) return undefined;
  const trimmed = cost.trim();
  return trimmed === '0' || /^free$/i.test(trimmed) ? 0 : undefined;
}

function toCoordinate(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function names(items: RaEvent['artists']): string {
  return (items ?? [])
    .map((item) => item.name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(', ');
}

/**
 * Pure transform: one RA event -> shared `StockholmEvent`. RA area listings are
 * electronic/club programming, so the category is fixed to `nightlife`. Missing
 * flyers fall back to a category image (og:image enrichment refines it later via
 * `ticketUrl`); the description falls back to genres/lineup when RA has no copy.
 */
export function mapRaEvent(raw: RaEvent): StockholmEvent {
  const startsAt = raLocalToUtc(raw.startTime) ?? raLocalToUtc(raw.date);
  if (!startsAt) {
    throw new Error(`Resident Advisor event ${raw.id} has no resolvable start time`);
  }

  const venue = raw.venue ?? undefined;
  const genres = names(raw.genres);
  const lineup = names(raw.artists);
  const description =
    raw.content?.trim() ||
    [genres && `Genres: ${genres}`, lineup && `Lineup: ${lineup}`].filter(Boolean).join(' · ') ||
    raw.title;
  const url = raw.contentUrl ? `${SITE_BASE}${raw.contentUrl}` : undefined;

  return {
    id: `${RESIDENT_ADVISOR_SOURCE}:${raw.id}`,
    title: raw.title,
    description,
    category: 'nightlife',
    imageUrl: raw.flyerFront || fallbackImageFor('nightlife'),
    startsAt,
    endsAt: raLocalToUtc(raw.endTime),
    venue: {
      name: venue?.name?.trim() || 'Stockholm',
      address: '',
      district: venue?.area?.name?.trim() || 'Stockholm',
      latitude: toCoordinate(venue?.location?.latitude),
      longitude: toCoordinate(venue?.location?.longitude),
    },
    priceSek: parseRaCost(raw.cost),
    ticketUrl: url,
    organizer: raw.promoters?.[0]?.name?.trim() || venue?.name?.trim() || 'Resident Advisor',
    source: RESIDENT_ADVISOR_SOURCE,
    sourceId: raw.id,
    sourceUrl: url,
    updatedAt: raw.dateUpdated ?? new Date().toISOString(),
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
