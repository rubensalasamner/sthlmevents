import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { APIFY_FACEBOOK_SOURCE, type ApifyFbEventRaw } from './types.js';

/** Titles matching this are near-certain out-of-town noise from FB's loose search. */
const NON_STOCKHOLM_TITLE_RE =
  /ottawa|melbourne|reno|langley|kelowna|richmond|antigonish|casper|mount dora|flemington|bloomfield|mentone|breckenridge|carmichael|anna, il/i;

/**
 * Adapter-level pre-filter BEFORE mapping: every raw row dropped here saves
 * the mapping of an event the app would never show. Country + venue text are
 * the reliable signals (verified 2026-09-15 log: "pop up sale Stockholm"
 * returned Ottawa/Melbourne/Reno events; FB's city targeting is loose).
 * A missing countryCode keeps the row — venue text decides alone.
 */
export function looksLikeStockholmEvent(raw: ApifyFbEventRaw): boolean {
  const country = raw['location.countryCode'];
  if (country && country !== 'SE') return false;
  const venue = raw['location.name'] ?? '';
  if (NON_STOCKHOLM_TITLE_RE.test(raw.name)) return false;
  if (venue === '') return true; // title-only rows: keep, dedupe/ranking sorts it out
  return /stockholm|södermalm|norrmalm|östermalm|vasastan|kungsholmen|djurgården|solna|sundbyberg|lidingö|nacka|huddinge|täby|bromma|årsta|farsta|skärholmen|spånga|järva|stockholmsmässan|a-house|uggelviksgatan/i.test(
    venue,
  );
}

/**
 * Quality 0-100 from real signals (verified against the 2026-09-15 fixture):
 * combined going+interested dominates — ARAKII (1298) and PICK A POPPY (706)
 * are the strongest long-tail candidates, US fundraiser noise sits < 10.
 */
export function qualityScoreOf(raw: ApifyFbEventRaw): number {
  const interest = (raw.usersGoing ?? 0) + (raw.usersInterested ?? 0);
  const interestPart = Math.round(70 * Math.min(1, interest / 200));
  const imagePart = raw.imageUrl ? 20 : 0;
  const descriptionPart = raw.description ? 10 : 0;
  return Math.min(100, interestPart + imagePart + descriptionPart);
}

function parseDurationMs(duration: string | null | undefined): number | undefined {
  if (!duration) return undefined;
  const days = duration.match(/^(\d+)\s+days?$/);
  if (days) return Number(days[1]) * 24 * 60 * 60 * 1000;
  const hours = duration.match(/^(\d+)\s+hr$/);
  if (hours) return Number(hours[1]) * 60 * 60 * 1000;
  return undefined;
}

/**
 * Pure transform: one raw Facebook event -> shared `StockholmEvent`.
 * Stockholm filtering happens BEFORE this in the adapter; the mapper stays
 * total and testable against any fixture row.
 *
 * Documented source gaps handled here:
 *  - venue is a free-text address (no lat/lon, no city) -> geocode stage
 *    resolves coordinates later, keyed on this text
 *  - fbcdn imageUrl is signed and expires (oe param) — `hostFragileImages`
 *    re-hosts these on R2 when credentials are present; otherwise refreshed
 *    each Apify snapshot run
 *  - no description in search results -> empty string; LLM categorizer and
 *    og:image enrichment (over the event URL) fill the gap
 *  - no price anywhere -> `priceSek` stays undefined ("See details")
 */
export function mapFacebookEvent(raw: ApifyFbEventRaw): StockholmEvent {
  const startsAt = new Date(raw.utcStartDate).toISOString();
  const durationMs = parseDurationMs(raw.duration);
  const endsAt = durationMs
    ? new Date(new Date(startsAt).getTime() + durationMs).toISOString()
    : undefined;
  const venueText = raw['location.name'] ?? '';
  const fbEventId = raw.url.split('/').filter(Boolean).pop() ?? raw.url;
  const category = 'popup';

  return {
    id: `${APIFY_FACEBOOK_SOURCE}:${fbEventId}`,
    title: raw.name,
    description: raw.description ?? '',
    category,
    imageUrl: raw.imageUrl ?? fallbackImageFor(category),
    startsAt,
    endsAt,
    venue: {
      name: venueText || 'Stockholm',
      address: venueText,
      district: '',
    },
    priceSek: undefined,
    organizer: raw.organizedBy?.replace(/^Event by\s+/i, '').trim() || 'Facebook event',
    source: APIFY_FACEBOOK_SOURCE,
    sourceId: fbEventId,
    sourceUrl: raw.url,
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: qualityScoreOf(raw),
  };
}
