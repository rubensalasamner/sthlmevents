import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { RESIDENT_ADVISOR_SOURCE, mapRaEvent } from './mapper.js';
import {
  EVENT_LISTINGS_QUERY,
  STOCKHOLM_AREA_ID,
  buildVariables,
  listingWindow,
} from './query.js';
import type { RaEvent, RaEventListings, RaEventListingsResponse } from './types.js';

const GRAPHQL_URL = 'https://ra.co/graphql';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const PAGE_SIZE = 50;
const WINDOW_DAYS = 90;

function hasStart(event: RaEvent | null): event is RaEvent {
  return Boolean(event) && Boolean(event!.startTime || event!.date);
}

/**
 * Reads Greater Stockholm (area 396) club/nightlife listings from RA's public
 * GraphQL. One flat query returns everything the mapper needs — including venue
 * coordinates — so pagination is the adapter's only orchestration concern.
 */
export class ResidentAdvisorAdapter implements SourceAdapter {
  readonly id = RESIDENT_ADVISOR_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;
    const maxPages = options.maxPages ?? Infinity;
    const window = listingWindow(new Date(), WINDOW_DAYS);

    const events: StockholmEvent[] = [];

    for (let page = 1, pagesFetched = 0; pagesFetched < maxPages; page += 1, pagesFetched += 1) {
      const listing = await this.fetchPage(doFetch, window, page);
      const items = listing.data;

      for (const raw of items.map((item) => item.event).filter(hasStart)) {
        events.push(mapRaEvent(raw));
      }

      // A short page (fewer entries than requested) is the last page. Termination
      // keys on listing size, not mapped count, so filtered-out events can't stall it.
      if (items.length < PAGE_SIZE) break;
    }

    return events;
  }

  private async fetchPage(
    doFetch: typeof fetch,
    window: { gte: string; lte: string },
    page: number,
  ): Promise<RaEventListings> {
    const response = await doFetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        Referer: 'https://ra.co/events/se/stockholm',
      },
      body: JSON.stringify({
        query: EVENT_LISTINGS_QUERY,
        variables: buildVariables(STOCKHOLM_AREA_ID, window, PAGE_SIZE, page),
      }),
    });

    if (!response.ok) {
      throw new Error(`Resident Advisor GraphQL ${response.status} at ${GRAPHQL_URL}`);
    }

    const body = (await response.json()) as RaEventListingsResponse;
    if (body.errors?.length) {
      throw new Error(`Resident Advisor GraphQL errors: ${body.errors.map((e) => e.message).join('; ')}`);
    }

    const listing = body.data?.eventListings;
    if (!listing) {
      throw new Error('Resident Advisor GraphQL returned no eventListings');
    }
    return listing;
  }
}
