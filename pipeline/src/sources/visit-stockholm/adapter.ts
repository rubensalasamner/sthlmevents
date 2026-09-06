import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { mapVisitStockholmEvent, VISIT_STOCKHOLM_SOURCE } from './mapper.js';
import type { VsEventsResponse } from './types.js';

const BASE_URL = 'https://api.visitstockholm.com/api/public-v1/events/';
const PAGE_SIZE = 100;
const USER_AGENT = 'sthlmevents/0.1 (+https://github.com/sthlmevents)';

/**
 * Fetches all public events from the Visit Stockholm SBR Public API.
 * Data is CC BY 4.0 — attribution to Visit Stockholm is required downstream.
 */
export class VisitStockholmAdapter implements SourceAdapter {
  readonly id = VISIT_STOCKHOLM_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;
    const maxPages = options.maxPages ?? Infinity;

    const events: StockholmEvent[] = [];
    let page: number | null = 1;
    let pagesFetched = 0;

    while (page !== null && pagesFetched < maxPages) {
      const url = `${BASE_URL}?size=${PAGE_SIZE}&page=${page}`;
      const response = await doFetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      });
      if (!response.ok) {
        throw new Error(`Visit Stockholm API ${response.status} at ${url}`);
      }

      const body = (await response.json()) as VsEventsResponse;
      for (const raw of body.results) {
        events.push(mapVisitStockholmEvent(raw));
      }

      page = body.next;
      pagesFetched += 1;
    }

    return events;
  }
}
