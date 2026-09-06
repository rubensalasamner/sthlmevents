import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { BIBLIOTEKET_SOURCE, mapBibEvent } from './mapper.js';
import type { BibEvent, BibResponse, BibSearchVariables } from './types.js';

const GRAPHQL_URL = 'https://biblioteket.stockholm.se/graphql';
const PAGE_SIZE = 500;
const MAX_PAGES = 6;

const QUERY = `
  query eventSearch(
    $query: String!, $size: Int, $from: Int,
    $startDate: String, $stopDate: String, $isSchoolEvent: Boolean
  ) {
    eventSearch(
      query: $query, size: $size, from: $from,
      startDate: $startDate, stopDate: $stopDate, isSchoolEvent: $isSchoolEvent
    ) {
      results
      events {
        id title eventSlugId
        description { preamble }
        image { url }
        library
        externalEventLink
        dateTime { startDate stopDate startTime stopTime }
        targetAudiences
      }
    }
  }
`;

function stockholmDateFromNow(days: number): string {
  const ms = Date.now() + days * 86_400_000;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

async function searchPage(
  doFetch: typeof fetch,
  variables: BibSearchVariables,
): Promise<BibEvent[]> {
  const response = await doFetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; sthlmevents-pipeline)',
      Origin: 'https://biblioteket.stockholm.se',
      Referer: 'https://biblioteket.stockholm.se/evenemang',
    },
    body: JSON.stringify({ query: QUERY, variables }),
  });

  if (!response.ok) {
    throw new Error(`Biblioteket ${response.status} at ${GRAPHQL_URL}`);
  }

  const payload = (await response.json()) as BibResponse;
  if (payload.errors?.length) {
    throw new Error(`Biblioteket GraphQL error: ${payload.errors[0]?.message}`);
  }
  return payload.data?.eventSearch?.events ?? [];
}

/**
 * The site's own Apollo Server (`eventSearch`, the exact query the website
 * bundle issues — introspection is disabled). Served via offset pagination
 * (`from`), server caps `results` at 2000; a ~90-day window keeps us under
 * that while covering the pipeline's horizon. School events are excluded
 * (class bookings, not public happenings).
 */
export class BiblioteketAdapter implements SourceAdapter {
  readonly id = BIBLIOTEKET_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;

    const startDate = stockholmDateFromNow(-7);
    const stopDate = stockholmDateFromNow(90);
    const collected: BibEvent[] = [];
    let from = 0;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const events = await searchPage(doFetch, {
        query: '',
        size: PAGE_SIZE,
        from,
        startDate,
        stopDate,
        isSchoolEvent: false,
      });

      collected.push(...events);
      if (events.length < PAGE_SIZE) break;
      from += events.length;
    }

    return collected
      .filter((raw) => raw.id && raw.title && raw.dateTime?.startDate)
      .map(mapBibEvent)
      .filter((event): event is StockholmEvent => event !== null);
  }
}
