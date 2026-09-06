import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { TICKETMASTER_SOURCE, mapTicketmasterEvent, resolveTicketmasterStart } from './mapper.js';
import type { TmEvent, TmEventsResponse } from './types.js';

const API_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';
const PAGE_SIZE = 100;
// Discovery API refuses deep paging beyond 1000 results (size * page).
const MAX_RESULTS = 1000;

function hasResolvableStart(event: TmEvent): boolean {
  return resolveTicketmasterStart(event.dates?.start) !== undefined;
}

/**
 * Fetches Stockholm events from the Ticketmaster Discovery API. The API key is
 * read from the environment (`TICKETMASTER_API_KEY`, loaded from `pipeline/.env`)
 * so no secret is baked into the adapter or the registry.
 */
export class TicketmasterAdapter implements SourceAdapter {
  readonly id = TICKETMASTER_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error('TICKETMASTER_API_KEY is not set (add it to pipeline/.env)');
    }

    const doFetch = options.fetchImpl ?? fetch;
    const maxPages = options.maxPages ?? Infinity;

    const events: StockholmEvent[] = [];

    for (let page = 0, pagesFetched = 0; pagesFetched < maxPages; page += 1, pagesFetched += 1) {
      const { events: raws, totalPages } = await this.fetchPage(doFetch, apiKey, page);
      if (raws.length === 0) break;

      for (const raw of raws.filter(hasResolvableStart)) {
        events.push(mapTicketmasterEvent(raw));
      }

      const nextOffset = (page + 1) * PAGE_SIZE;
      if (page + 1 >= totalPages || nextOffset >= MAX_RESULTS) break;
    }

    return events;
  }

  private async fetchPage(
    doFetch: typeof fetch,
    apiKey: string,
    page: number,
  ): Promise<{ events: TmEvent[]; totalPages: number }> {
    const url = new URL(API_URL);
    url.search = new URLSearchParams({
      apikey: apiKey,
      countryCode: 'SE',
      city: 'Stockholm',
      size: String(PAGE_SIZE),
      page: String(page),
      sort: 'date,asc',
    }).toString();

    const response = await doFetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Ticketmaster Discovery ${response.status} at page ${page}`);
    }

    const body = (await response.json()) as TmEventsResponse;
    return {
      events: body._embedded?.events ?? [],
      totalPages: body.page?.totalPages ?? 1,
    };
  }
}
