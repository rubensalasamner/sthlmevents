/**
 * Raw schema.org types for the JSON-LD `ItemList` Eventbrite embeds in its
 * Stockholm discovery page (`/d/sweden--stockholm/events/`). Only the fields
 * the pipeline consumes are typed. The list-page contract is intentionally
 * shallow: dates are date-only (no time) and there is no price or organizer.
 */

export type EbGeo = {
  '@type'?: 'GeoCoordinates';
  latitude?: string | number;
  longitude?: string | number;
};

export type EbPostalAddress = {
  '@type'?: 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
};

export type EbPlace = {
  '@type': 'Place';
  name?: string;
  address?: EbPostalAddress;
  geo?: EbGeo;
};

export type EbVirtualLocation = {
  '@type': 'VirtualLocation';
  name?: string;
  url?: string;
};

export type EbLocation = EbPlace | EbVirtualLocation;

export type EbEvent = {
  '@type': 'Event';
  name: string;
  description?: string;
  /** Canonical `/e/...-tickets-<id>` event page. */
  url: string;
  image?: string;
  /** Date-only (`YYYY-MM-DD`) on the list page. */
  startDate: string;
  endDate?: string;
  /** `https://schema.org/OfflineEventAttendanceMode` | `...OnlineEventAttendanceMode`. */
  eventAttendanceMode?: string;
  location?: EbLocation;
};

export type EbListItem = {
  position?: number;
  '@type'?: string;
  item: EbEvent;
};

export type EbItemList = {
  '@context'?: string;
  '@type'?: string;
  itemListElement?: EbListItem[];
};
