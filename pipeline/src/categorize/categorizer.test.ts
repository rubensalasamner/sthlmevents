import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { OpenAiCategorizer } from './categorizer.js';

type RecordedRequest = { url: string; headers: Record<string, string>; body: any };

function provider(responder: () => Response, requests?: RecordedRequest[]): typeof fetch {
  return (async (url: string | URL, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    requests?.push({ url: String(url), headers, body: JSON.parse(String(init?.body ?? '{}')) });
    return responder();
  }) as unknown as typeof fetch;
}

function completion(categories: unknown[]): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ categories }) } }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function httpError(status: number, body: string): Response {
  return new Response(body, { status, headers: { 'content-type': 'application/json' } });
}

describe('OpenAiCategorizer', () => {
  test('sends the best-fit prompt and the batch to the chat endpoint', async () => {
    const requests: RecordedRequest[] = [];
    const categorizer = new OpenAiCategorizer({
      apiKey: 'gsk_test',
      baseUrl: 'https://api.groq.com/openai/v1/',
      model: 'test-model',
      fetchImpl: provider(() => completion(['music']), requests),
    });

    assert.deepEqual(await categorizer.categorize(['Konsert på Kafé 44']), ['music']);

    const request = requests[0]!;
    assert.equal(request.url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(request.headers.Authorization, 'Bearer gsk_test');
    assert.equal(request.body.model, 'test-model');
    assert.equal(request.body.temperature, 0);
    assert.deepEqual(request.body.response_format, { type: 'json_object' });
    const system: string = request.body.messages[0].content;
    assert.match(system, /exactly one category from the provided list/);
    assert.match(system, /only use "other" when/);
    assert.match(system, /guided tour is art/);
    const user = JSON.parse(request.body.messages[1].content);
    assert.deepEqual(user.items, ['Konsert på Kafé 44']);
  });

  test('maps unknown categories and non-strings to null', async () => {
    const categorizer = new OpenAiCategorizer({
      apiKey: 'k',
      fetchImpl: provider(() => completion(['music', 'dragshow', 42, null, 'theatre'])),
    });

    assert.deepEqual(await categorizer.categorize(['a', 'b', 'c', 'd', 'e']), [
      'music',
      null,
      null,
      null,
      'theatre',
    ]);
  });

  test('accepts "other" as a valid model answer', async () => {
    const categorizer = new OpenAiCategorizer({
      apiKey: 'k',
      fetchImpl: provider(() => completion(['other'])),
    });

    assert.deepEqual(await categorizer.categorize(['Okänt dropp']), ['other']);
  });

  test('retries rate limits and succeeds', async () => {
    const requests: RecordedRequest[] = [];
    let call = 0;
    const categorizer = new OpenAiCategorizer({
      apiKey: 'k',
      fetchImpl: provider(
        () => (call++ === 0 ? httpError(429, 'rate limited') : completion(['art'])),
        requests,
      ),
    });

    assert.deepEqual(await categorizer.categorize(['Utställning']), ['art']);
    assert.equal(requests.length, 2, 'one retry after 429');
  });

  test('does not retry a model that no longer exists', async () => {
    const requests: RecordedRequest[] = [];
    const categorizer = new OpenAiCategorizer({
      apiKey: 'k',
      fetchImpl: provider(() => httpError(404, '{"error":{"code":"model_not_found"}}'), requests),
    });

    await assert.rejects(categorizer.categorize(['a']), /categorizer API 404/);
    assert.equal(requests.length, 1, 'failover to the next model is the caller\'s job');
  });

  test('does not retry a wrong-length answer', async () => {
    const requests: RecordedRequest[] = [];
    const categorizer = new OpenAiCategorizer({
      apiKey: 'k',
      fetchImpl: provider(() => completion(['music']), requests),
    });

    await assert.rejects(categorizer.categorize(['a', 'b']), /returned 1 results for 2 items/);
    assert.equal(requests.length, 1);
  });
});
