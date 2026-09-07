/**
 * Raw types for the Kulturbiljetter Events API v3.
 * Docs: https://kulturbiljetter.se/api/events/
 * Only the fields the pipeline consumes are typed. Responses are JSON but the
 * collection containers are numeric-keyed objects, not arrays.
 */

/** Entry in the list response (`GET /api/v3/events/`) — ids + ETags only. */
export type KbListEntry = {
  event_id: number;
  organizer_id?: number;
  ETag: string;
};

export type KbOrganizer = {
  organizer_id?: number;
  name?: string | null;
  logo?: string | null;
};

export type KbImageMap = Record<string, string> | null;

export type KbDate = {
  date_id: number;
  location_id?: number;
  /** UNIX seconds — kassan öppnar. */
  unixtime_open?: number | null;
  /** UNIX seconds — föreställningen börjar. */
  unixtime_start: number;
  ticket_amount?: number | null;
  ticket_available?: number | null;
  /** True when the showing should be presented as date-only (no clock time). */
  date_only?: boolean;
  url_checkout?: string | null;
};

export type KbLocation = {
  location_id: number;
  name?: string | null;
  street?: string | null;
  /** Stadsdel / område. */
  vicinity?: string | null;
  city?: string | null;
};

export type KbEventDetail = {
  title: string;
  presentation_short?: string | null;
  presentation_long?: string | null;
  /** UNIX seconds — biljettsläpp. */
  unixtime_release?: number | null;
  /** Lägsta pris (SEK string), may be null. */
  price_min?: string | null;
  /** Högsta pris (SEK string), may be null. */
  price_max?: string | null;
  organizer?: KbOrganizer;
  images?: KbImageMap;
  dates?: Record<string, KbDate> | null;
  locations?: Record<string, KbLocation> | null;
  url_checkout?: string | null;
  url_event_page?: string | null;
  url_organizer_serp?: string | null;
};

/** The list endpoint returns a numeric-keyed object of entries, not an array. */
export type KbListResponse = Record<string, KbListEntry>;
