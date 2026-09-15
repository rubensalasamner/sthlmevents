import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runEventsScraper } from './types.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('runEventsScraper', () => {
  it('POSTs to run-sync-get-dataset-items with token and charge cap', async () => {
    let capturedUrl = '';
    let capturedBody: unknown;
    const fetchImpl = (async (input: URL | Request, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse([{ name: 'x', url: 'https://www.facebook.com/events/1/', utcStartDate: '2026-01-01T00:00:00.000Z' }]);
    }) as unknown as typeof fetch;

    const rows = await runEventsScraper({
      token: 'tok',
      input: { searchQueries: ['loppis Stockholm'], maxEvents: 10 },
      maxTotalChargeUsd: 0.5,
      fetchImpl,
    });

    assert.ok(capturedUrl.startsWith('https://api.apify.com/v2/acts/apify~facebook-events-scraper/run-sync-get-dataset-items'));
    assert.ok(capturedUrl.includes('token=tok'));
    assert.ok(capturedUrl.includes('maxTotalChargeUsd=0.5'));
    assert.deepEqual(capturedBody, { searchQueries: ['loppis Stockholm'], maxEvents: 10 });
    assert.equal(rows.length, 1);
  });

  it('surfaces API errors with status and body', async () => {
    const fetchImpl = (async () => jsonResponse({ error: 'nope' }, 402)) as typeof fetch;
    await assert.rejects(
      runEventsScraper({ token: 'tok', input: {}, fetchImpl }),
      /HTTP 402/,
    );
  });
});
