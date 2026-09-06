/**
 * Raw types for Resident Advisor's public GraphQL (`POST https://ra.co/graphql`),
 * `eventListings` query. Only the fields the pipeline consumes are typed. Times
 * are `LocalDateTime` (no offset) in Stockholm wall-clock; `cost` is free text.
 */

export type RaGeoLocation = {
  latitude?: number | null;
  longitude?: number | null;
};

export type RaNamed = { name?: string | null };

export type RaVenue = {
  id?: string;
  name?: string | null;
  contentUrl?: string | null;
  area?: RaNamed | null;
  location?: RaGeoLocation | null;
};

export type RaEvent = {
  id: string;
  title: string;
  /** Listing day at local midnight, e.g. "2026-09-02T00:00:00.000". */
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  /** Free-text ticket cost, e.g. "0", "25 ", or a tiered price blurb. */
  cost?: string | null;
  content?: string | null;
  /** Path to the event page, e.g. "/events/2506426". */
  contentUrl?: string | null;
  flyerFront?: string | null;
  isTicketed?: boolean | null;
  dateUpdated?: string | null;
  venue?: RaVenue | null;
  artists?: RaNamed[] | null;
  promoters?: RaNamed[] | null;
  genres?: RaNamed[] | null;
};

export type RaEventListing = { event: RaEvent | null };

export type RaEventListings = {
  totalResults: number;
  data: RaEventListing[];
};

export type RaEventListingsResponse = {
  data?: { eventListings?: RaEventListings | null } | null;
  errors?: { message: string }[];
};
