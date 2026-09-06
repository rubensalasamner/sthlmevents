import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { mapMeetupCategory } from './category-map.js';
import type { MeetupEvent, MeetupPhoto } from './types.js';

export const MEETUP_SOURCE = 'meetup';
const DEFAULT_QUALITY_SCORE = 45;

function photoUrl(photo: MeetupPhoto | null | undefined): string | undefined {
  return photo?.highResUrl || (photo?.baseUrl ? `${photo.baseUrl}${photo.id ?? ''}` : undefined);
}

/**
 * Meetup's `feeSettings` is sparse on the find contract; when a fee exists its
 * amount is in the group's currency. Only SEK-denominated amounts map to
 * `priceSek`; anything else stays unknown.
 */
function priceSek(feeSettings: MeetupEvent['feeSettings']): number | undefined {
  const fee = feeSettings?.fee;
  if (!fee || typeof fee.amount !== 'number') return undefined;
  return fee.currency === 'SEK' ? fee.amount : undefined;
}

/**
 * Pure transform: one Meetup find-page event -> shared `StockholmEvent`.
 * `dateTime`/`endTime` are ISO instants with a UTC offset, converted to plain
 * UTC ISO. Venues have no coordinates on this contract — the geocoding stage
 * fills them later from name/address.
 */
export function mapMeetupEvent(raw: MeetupEvent): StockholmEvent {
  const category = mapMeetupCategory(raw.title);
  const imageUrl = photoUrl(raw.featuredEventPhoto) ?? photoUrl(raw.displayPhoto);

  return {
    id: `${MEETUP_SOURCE}:${raw.id}`,
    title: raw.title,
    description: '',
    category,
    imageUrl: imageUrl || fallbackImageFor(category),
    startsAt: new Date(raw.dateTime!).toISOString(),
    endsAt: raw.endTime ? new Date(raw.endTime).toISOString() : undefined,
    venue: {
      name: raw.venue?.name?.trim() || 'Stockholm',
      address: raw.venue?.address?.trim() ?? '',
      district: raw.venue?.city?.trim() || 'Stockholm',
    },
    priceSek: priceSek(raw.feeSettings),
    ticketUrl: raw.eventUrl,
    // Viewing the event page is public; RSVP'ing requires a Meetup account.
    requiresAccount: true,
    organizer: raw.group?.name?.trim() || 'Meetup',
    source: MEETUP_SOURCE,
    sourceId: raw.id,
    sourceUrl: raw.eventUrl,
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
