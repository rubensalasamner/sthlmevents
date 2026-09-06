import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { KULTURHUSET_SOURCE, mapKhsEvent } from './mapper.js';
import type { KhsEventSource, KhsSearchResponse } from './types.js';

const SEARCH_URL = 'https://elastic.kulturhusetstadsteatern.se/khst-events/_search';
const PAGE_SIZE = 500;
const MAX_PAGES = 6;

type EsQuery = {
  size: number;
  from: number;
  query: Record<string, unknown>;
  sort: Record<string, string>;
};

async function searchPage(doFetch: typeof fetch, from: number): Promise<KhsEventSource[]> {
  const body: EsQuery = {
    size: PAGE_SIZE,
    from,
    // Only ticketed occurrences from today onwards; sorted so pagination is
    // stable between pages.
    query: { range: { tixStartDate: { gte: 'now/d' } } },
    sort: { tixStartDate: 'asc' },
  };

  const response = await doFetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; sthlmevents-pipeline)',
      Referer: 'https://kulturhusetstadsteatern.se/kalender',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Kulturhuset ${response.status} at ${SEARCH_URL}`);
  }

  const payload = (await response.json()) as KhsSearchResponse;
  return payload.hits?.hits?.map((hit) => hit._source) ?? [];
}

/**
 * Queries the same Elasticsearch index the site's Vue calendar uses
 * (`elasticSearchUrl` in the page's drupalSettings). `_search` is open;
 * mapping/count endpoints are not. Pages through every upcoming occurrence
 * (the index holds ~1800 documents spanning a year).
 */
export class KulturhusetAdapter implements SourceAdapter {
  readonly id = KULTURHUSET_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;

    const collected: KhsEventSource[] = [];
    let from = 0;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const events = await searchPage(doFetch, from);
      collected.push(...events);
      if (events.length < PAGE_SIZE) break;
      from += events.length;
    }

    return collected
      .filter((raw) => raw.tixEventId && raw.tixName && raw.tixStartDate)
      .map(mapKhsEvent);
  }
}
