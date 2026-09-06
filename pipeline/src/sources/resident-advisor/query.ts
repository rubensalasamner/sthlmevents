import { stockholmLocalDate } from '../../shared/time.js';

/** Resident Advisor area id for Greater Stockholm. */
export const STOCKHOLM_AREA_ID = 396;

/**
 * `eventListings` requires a date window and an area filter. The projection is
 * flat on purpose: venue coordinates come back inline, so no per-venue lookup
 * is needed.
 */
export const EVENT_LISTINGS_QUERY = `query GetEventListings($filters: FilterInputDtoInput, $pageSize: Int, $page: Int) {
  eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
    totalResults
    data {
      event {
        id
        title
        date
        startTime
        endTime
        cost
        content
        contentUrl
        flyerFront
        isTicketed
        dateUpdated
        venue { id name contentUrl area { name } location { latitude longitude } }
        artists { name }
        promoters { name }
        genres { name }
      }
    }
  }
}`;

export type EventListingsVariables = {
  filters: {
    areas: { eq: number };
    listingDate: { gte: string; lte: string };
  };
  pageSize: number;
  page: number;
};

/** Stockholm-local date window `[now, now + days]` as `YYYY-MM-DD` strings. */
export function listingWindow(now: Date, days: number): { gte: string; lte: string } {
  const gte = stockholmLocalDate(now.toISOString());
  const lte = stockholmLocalDate(new Date(now.getTime() + days * 86_400_000).toISOString());
  return { gte, lte };
}

export function buildVariables(
  areaId: number,
  window: { gte: string; lte: string },
  pageSize: number,
  page: number,
): EventListingsVariables {
  return {
    filters: { areas: { eq: areaId }, listingDate: { gte: window.gte, lte: window.lte } },
    pageSize,
    page,
  };
}
