import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { MEETUP_SOURCE, mapMeetupEvent } from './mapper.js';
import { parseMeetupEvents } from './parse.js';
import type { MeetupEvent } from './types.js';

const FIND_URL = 'https://www.meetup.com/find/se--stockholm/';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/**
 * Keeps only physical, scheduled events. The find page mixes in online events
 * (unlocatable to Stockholm); entries without `dateTime` can't sit on a
 * timeline. Cross-source duplicates collapse in the shared dedup stage.
 */
export function isMappableMeetupEvent(raw: MeetupEvent): boolean {
  return Boolean(raw.id && raw.title && raw.dateTime && raw.eventType !== 'ONLINE' && !raw.isOnline);
}

/**
 * Scrapes Meetup's Stockholm find page. Meetup server-renders seven event
 * buckets into `__NEXT_DATA__`; that blob is the source of truth here (their
 * GraphQL/REST endpoints 404 for anonymous traffic, verified 2026-09). Yields
 * ~45 upcoming events with venue name/address; coordinates come from the
 * pipeline's geocoding stage. Paginated results are client-rendered and out of
 * scope; a curated group-pages track would unlock more.
 */
export class MeetupAdapter implements SourceAdapter {
  readonly id = MEETUP_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;

    const response = await doFetch(FIND_URL, {
      headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`Meetup ${response.status} at ${FIND_URL}`);
    }

    const html = await response.text();
    return parseMeetupEvents(html).filter(isMappableMeetupEvent).map(mapMeetupEvent);
  }
}
