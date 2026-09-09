export const EVENT_CATEGORIES = [
  'music',
  'art',
  'food',
  'sports',
  'theatre',
  'nightlife',
  'family',
  'shopping',
  'market',
  'popup',
  'comedy',
  'other',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type EventVenue = {
  name: string;
  address: string;
  /** Stockholm neighbourhood, e.g. "Södermalm". */
  district: string;
  /** Coordinates, when the source provides them. Events without them are hidden from the map. */
  latitude?: number;
  longitude?: number;
};

export type StockholmEvent = {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  imageUrl: string;
  /** ISO-8601 start timestamp. */
  startsAt: string;
  /** ISO-8601 end timestamp, when known. */
  endsAt?: string;
  /**
   * Start times of later occurrences of the same recurring event, when the list
   * collapsed them into this entry. Presentation-only; not part of the
   * pipeline model.
   */
  nextDates?: string[];
  venue: EventVenue;
  /** Ticket price in SEK. `0` means free; `undefined` means unknown (not published by the source). */
  priceSek?: number;
  ticketUrl?: string;
  /**
   * The source's own page requires a (free) account to complete the action —
   * e.g. RSVP on Meetup, registration on Eventbrite. The UI should label the
   * outbound link accordingly instead of implying a plain ticket purchase.
   */
  requiresAccount?: boolean;
  organizer: string;

  /** Ingestion provenance — identifies which adapter produced this event. */
  source: string;
  /** Stable id within the source, used as the dedup/upsert key. */
  sourceId: string;
  /** Canonical page for the event on the source site. */
  sourceUrl?: string;
  /** ISO-8601 timestamp of the last successful scrape/refresh. */
  updatedAt: string;
  /** Editorially promoted to the "featured" carousel. */
  isFeatured: boolean;
  /** 0–100 ranking signal used to surface higher-quality events first. */
  qualityScore: number;
};
