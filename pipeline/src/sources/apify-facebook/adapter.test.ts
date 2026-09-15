import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ApifyFacebookAdapter } from './adapter.js';
import type { ApifyFbEventRaw } from './types.js';

const STOCKHOLM_ROW: ApifyFbEventRaw = {
  name: 'Sample Sale Södermalm',
  url: 'https://www.facebook.com/events/111/',
  utcStartDate: '2026-09-20T10:00:00.000Z',
  duration: '1 day',
  usersGoing: 10,
  usersInterested: 20,
  organizedBy: 'Event by Test Brand',
  'location.name': 'Nytorgsgatan 21, 116 40 Stockholm',
  'location.city': null,
  'location.countryCode': 'SE',
};

const FOREIGN_ROW: ApifyFbEventRaw = {
  ...STOCKHOLM_ROW,
  name: 'Pop up sale elsewhere',
  url: 'https://www.facebook.com/events/222/',
  'location.name': 'Main St 1, Berlin',
  'location.countryCode': 'DE',
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fetchImplWith(rows: ApifyFbEventRaw[], capturedInput?: { value?: unknown }) {
  return (async (_input: URL | Request, init?: RequestInit) => {
    if (capturedInput) capturedInput.value = JSON.parse(String(init?.body));
    return jsonResponse(rows);
  }) as unknown as typeof fetch;
}

describe('ApifyFacebookAdapter', () => {
  it('throws a skip-signal error when no token is configured', async () => {
    const adapter = new ApifyFacebookAdapter({ token: undefined, fetchImpl: fetchImplWith([]) });
    delete process.env.APIFY_TOKEN;
    await assert.rejects(adapter.fetch(), /APIFY_TOKEN/);
  });

  it('filters to Stockholm and maps in one pass', async () => {
    const adapter = new ApifyFacebookAdapter({
      token: 'test-token',
      queries: ['utförsäljning Stockholm'],
      fetchImpl: fetchImplWith([STOCKHOLM_ROW, FOREIGN_ROW]),
    });
    const events = await adapter.fetch();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.sourceId, '111');
    assert.equal(events[0]?.source, 'apify-facebook');
  });

  it('runs date-windowed search URLs instead of raw queries', async () => {
    const captured: { value?: unknown } = {};
    const adapter = new ApifyFacebookAdapter({
      token: 'test-token',
      queries: ['sample sale Stockholm', 'loppis Stockholm'],
      today: new Date('2026-09-15T12:00:00Z'),
      fetchImpl: fetchImplWith([], captured),
    });
    await adapter.fetch({ maxPages: 1 });

    const input = captured.value as { startUrls: string[]; maxEvents: number };
    assert.equal(input.startUrls.length, 2);
    for (const url of input.startUrls) {
      assert.ok(url.startsWith('https://www.facebook.com/events/search/?q='), url);
      assert.ok(url.includes('filters='), url);
    }
    // window: today..today+90d (verified encoding: filter_events_date args)
    const filters = JSON.parse(
      Buffer.from(
        new URL(input.startUrls[0]!).searchParams.get('filters')!,
        'base64',
      ).toString('utf8'),
    ) as Record<string, string>;
    assert.deepEqual(JSON.parse(filters['filter_events_date_range:0']!), {
      name: 'filter_events_date',
      args: '2026-09-15~2026-12-14',
    });
    assert.equal(input.maxEvents, 10); // maxPages 1 * 10
  });

  it('defaults to maxEvents 20 for scheduled runs', async () => {
    const captured: { value?: unknown } = {};
    const adapter = new ApifyFacebookAdapter({
      token: 'test-token',
      queries: ['sample sale Stockholm'],
      fetchImpl: fetchImplWith([], captured),
    });
    await adapter.fetch();
    const input = captured.value as { maxEvents: number };
    assert.equal(input.maxEvents, 20);
  });

  it('is a registered SourceAdapter id', async () => {
    const { getAdapter } = await import('../index.js');
    assert.equal(getAdapter('apify-facebook').id, 'apify-facebook');
  });
});
