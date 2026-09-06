/**
 * Raw types for the Ticketmaster Discovery API v2 `events.json` response.
 * Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 * Only the fields the pipeline consumes are typed.
 */

export type TmImage = {
  url: string;
  width?: number;
  height?: number;
  ratio?: string;
};

export type TmLocation = {
  latitude?: string;
  longitude?: string;
};

export type TmVenue = {
  name?: string;
  city?: { name?: string };
  address?: { line1?: string };
  postalCode?: string;
  location?: TmLocation;
};

export type TmClassification = {
  primary?: boolean;
  segment?: { name?: string };
  genre?: { name?: string };
  subGenre?: { name?: string };
};

export type TmPriceRange = {
  type?: string;
  currency?: string;
  min?: number;
  max?: number;
};

export type TmDateStart = {
  localDate?: string;
  localTime?: string;
  /** UTC instant computed by Ticketmaster, e.g. "2026-09-03T16:30:00Z". */
  dateTime?: string;
  dateTBD?: boolean;
  dateTBA?: boolean;
  timeTBA?: boolean;
  noSpecificTime?: boolean;
};

export type TmAttraction = { name?: string };

export type TmEvent = {
  id: string;
  name: string;
  url?: string;
  info?: string;
  images?: TmImage[];
  dates?: { start?: TmDateStart };
  classifications?: TmClassification[];
  priceRanges?: TmPriceRange[];
  promoter?: { name?: string };
  _embedded?: {
    venues?: TmVenue[];
    attractions?: TmAttraction[];
  };
};

export type TmPage = {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
};

export type TmEventsResponse = {
  _embedded?: { events?: TmEvent[] };
  page?: TmPage;
};
