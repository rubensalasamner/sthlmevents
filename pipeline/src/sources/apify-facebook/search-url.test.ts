import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { facebookEventsSearchUrl } from './search-url.js';

describe('facebookEventsSearchUrl', () => {
  it('embeds the date range as base64-encoded JSON in filters', () => {
    const url = facebookEventsSearchUrl('utförsälning Stockholm', {
      from: '2026-09-15',
      to: '2026-12-14',
    });

    assert.ok(url.startsWith('https://www.facebook.com/events/search/?q='));
    assert.ok(url.includes('q=utf%C3%B6rs%C3%A4lning%20Stockholm'));

    const filtersParam = new URL(url).searchParams.get('filters');
    assert.ok(filtersParam);
    const decoded = JSON.parse(Buffer.from(filtersParam, 'base64').toString('utf8')) as Record<
      string,
      string
    >;
    assert.deepEqual(JSON.parse(decoded['filter_events_date_range:0']!), {
      name: 'filter_events_date',
      args: '2026-09-15~2026-12-14',
    });
  });
});
