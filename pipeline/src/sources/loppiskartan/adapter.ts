import type { FetchOptions, SourceAdapter } from '../source-adapter.js';
import type { StockholmEvent } from '../../shared/event.js';
import { LOPPISKARTAN_SOURCE, mapLoppisRow } from './mapper.js';
import { parseLoppiskartan } from './parse.js';

const CALENDAR_URL = 'https://loppiskartan.se/loppiskalender';
const USER_AGENT = 'sthlmevents/0.1 (+https://github.com/sthlmevents)';
const STOCKHOLM_REGION = 'Stockholm';

/**
 * Scrapes the dated national flea-market calendar and keeps only Greater
 * Stockholm ("Stockholms län"). One HTTP request; parsing is a pure, tested
 * function over the returned HTML.
 */
export class LoppiskartanAdapter implements SourceAdapter {
  readonly id = LOPPISKARTAN_SOURCE;

  async fetch(options: FetchOptions = {}): Promise<StockholmEvent[]> {
    const doFetch = options.fetchImpl ?? fetch;

    const response = await doFetch(CALENDAR_URL, {
      headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`Loppiskartan ${response.status} at ${CALENDAR_URL}`);
    }

    const html = await response.text();
    return parseLoppiskartan(html)
      .filter((row) => row.region.includes(STOCKHOLM_REGION))
      .map(mapLoppisRow);
  }
}
