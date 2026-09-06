import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { LUMA_SOURCE, mapLumaEntry } from './mapper.js';
import { parseLumaEvents } from './parse.js';
import type { LumaEntry } from './types.js';

const DISCOVERY_URL = 'https://lu.ma/stockholm';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/**
 * Keeps only in-person entries that carry a start time. Online events under a
 * city page can't be located to Stockholm; entries without `start_at` can't be
 * placed on a timeline.
 */
export function isMappableLumaEntry(entry: LumaEntry): boolean {
  const event = entry?.event;
  return Boolean(event && event.location_type === 'offline' && event.start_at);
}

/**
 * Scrapes Luma's Stockholm discovery page. Luma hydrates the place's upcoming
 * events into `__NEXT_DATA__`; that server-rendered blob is the source of truth
 * here (the deeper, paginated set lives behind a client-side API and is out of
 * scope). Yields the soonest ~20 community/tech events with coordinates.
 */
export class LumaAdapter implements SourceAdapter {
  readonly id = LUMA_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;

    const response = await doFetch(DISCOVERY_URL, {
      headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`Luma ${response.status} at ${DISCOVERY_URL}`);
    }

    const html = await response.text();
    return parseLumaEvents(html).filter(isMappableLumaEntry).map(mapLumaEntry);
  }
}
