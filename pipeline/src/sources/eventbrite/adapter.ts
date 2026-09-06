import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { EVENTBRITE_SOURCE, mapEventbriteEvent } from './mapper.js';
import { parseEventbriteEvents } from './parse.js';
import type { EbEvent } from './types.js';

const DISCOVERY_URL = 'https://www.eventbrite.com/d/sweden--stockholm/events/';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
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
      headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`Eventbrite ${response.status} at ${DISCOVERY_URL}`);
    }

    const html = await response.text();
    return parseEventbriteEvents(html).filter(isInPersonEvent).map(mapEventbriteEvent);
  }
}
