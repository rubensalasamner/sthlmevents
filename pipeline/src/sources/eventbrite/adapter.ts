import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { EVENTBRITE_SOURCE, mapEventbriteEvent } from './mapper.js';
import { parseEventbriteEvents } from './parse.js';
import type { EbEvent } from './types.js';

const DISCOVERY_URL = 'https://www.eventbrite.com/d/sweden--stockholm/events/';
// Full browser-like header set: Eventbrite's bot filter rejects requests that
// look like scripts (405), especially from datacenter IPs such as CI runners.
const BROWSER_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9,sv;q=0.8',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};
const ONLINE_MODE = 'https://schema.org/OnlineEventAttendanceMode';

/**
 * Keeps only in-person events. They carry geo coordinates and a verified
 * Stockholm-region address; online results under a Stockholm search are
 * frequently global and can't be located to the city.
 */
export function isInPersonEvent(raw: EbEvent): boolean {
  return raw.eventAttendanceMode !== ONLINE_MODE;
}

/**
 * Scrapes Eventbrite's Stockholm discovery page. Eventbrite server-renders a
 * schema.org `ItemList` of the soonest ~35 events directly in the HTML — that
 * public JSON-LD is the source of truth here. Deeper pages are client-rendered
 * and out of scope; broader coverage should come from a keyed API instead.
 */
export class EventbriteAdapter implements SourceAdapter {
  readonly id = EVENTBRITE_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;

    const response = await doFetch(DISCOVERY_URL, {
      headers: BROWSER_HEADERS,
    });
    if (!response.ok) {
      throw new Error(`Eventbrite ${response.status} at ${DISCOVERY_URL}`);
    }

    const html = await response.text();
    return parseEventbriteEvents(html).filter(isInPersonEvent).map(mapEventbriteEvent);
  }
}
