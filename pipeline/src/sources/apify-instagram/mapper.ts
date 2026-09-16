import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { stockholmLocalToUtcIso } from '../../shared/time.js';
import { APIFY_INSTAGRAM_SOURCE, type IgPostRaw } from './types.js';
import { extractVenue, type ParsedCaption } from './caption.js';

/**
 * Quality 0-100 for IG posts. IG's engagement scale differs from FB events
 * (probe median likes ~50-300 for real event posts; brand ads run into
 * thousands), so the interest curve saturates at 300 — a post a real
 * organizer pushed gets mid-range score, viral brand content tops out.
 */
export function qualityScoreOf(raw: IgPostRaw): number {
  const interest = (raw.likesCount ?? 0) + (raw.commentsCount ?? 0);
  const interestPart = Math.round(60 * Math.min(1, interest / 300));
  const imagePart = raw.imageUrl ?? raw.displayUrl ? 25 : 0;
  const captionPart = (raw.caption ?? '').length > 120 ? 15 : 0;
  return Math.min(100, interestPart + imagePart + captionPart);
}

function captionOf(raw: IgPostRaw): string {
  return raw.caption ?? '';
}

/**
 * Pure transform: one raw IG post (+ its pre-parsed caption window) ->
 * shared `StockholmEvent`. Stockholm filtering and date parsing happen
 * BEFORE this in the adapter; the mapper stays total.
 *
 * Documented source gaps handled here:
 *  - no structured venue -> caption-extracted text; geocode stage resolves
 *    coordinates later; events with no extractable venue keep the
 *    category fallback ("Stockholm")
 *  - no price -> `priceSek` stays undefined ("See details")
 *  - the post timestamp is NOT the event date; the parsed caption date is
 *    authoritative and `startsAt` is built from it (Stockholm-local)
 *  - IG image URLs are CDN-signed but longer-lived than fbcdn; still
 *    refreshed every snapshot run like every other source
 */
export function mapInstagramPost(raw: IgPostRaw, parsed: ParsedCaption): StockholmEvent {
  const date = parsed.date!;
  const time = parsed.startTime ?? undefined;
  const startsAt = stockholmLocalToUtcIso(
    `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
    time,
  );
  const end = parsed.endDate;
  const endsAt = end
    ? stockholmLocalToUtcIso(
        `${end.year}-${String(end.month).padStart(2, '0')}-${String(end.day).padStart(2, '0')}`,
        parsed.endTime,
      )
    : undefined;

  const venueText = raw.location?.name ?? extractVenue(captionOf(raw)) ?? '';
  const postId = raw.shortCode ?? raw.id ?? captionOf(raw).slice(0, 40);

  return {
    id: `${APIFY_INSTAGRAM_SOURCE}:${postId}`,
    title: firstTitleLine(captionOf(raw)),
    description: captionOf(raw),
    category: 'popup',
    imageUrl: raw.imageUrl ?? raw.displayUrl ?? fallbackImageFor('popup'),
    startsAt,
    endsAt,
    venue: {
      name: venueText || 'Stockholm',
      address: venueText,
      district: '',
    },
    priceSek: undefined,
    organizer: raw.ownerFullName ?? raw.ownerUsername ?? 'Instagram',
    source: APIFY_INSTAGRAM_SOURCE,
    sourceId: postId,
    sourceUrl: raw.url ?? (raw.shortCode ? `https://www.instagram.com/p/${raw.shortCode}/` : undefined),
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: qualityScoreOf(raw),
  };
}

/** First meaningful caption line becomes the title (emoji-stripped, capped). */
function firstTitleLine(caption: string): string {
  const line =
    caption
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length >= 6) ?? caption;
  const stripped = line.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim();
  return (stripped || line).slice(0, 80);
}
