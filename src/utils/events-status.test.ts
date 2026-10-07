import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { resolveEventsStatus } from './events-status.js';

const failure = new Error('offline');

describe('resolveEventsStatus', () => {
  test('content is ready even while reloading or after an error', () => {
    assert.equal(resolveEventsStatus({ loading: true, error: failure, empty: false }), 'ready');
  });

  test('empty while loading shows loading', () => {
    assert.equal(resolveEventsStatus({ loading: true, error: null, empty: true }), 'loading');
  });

  test('empty after a failure shows the error', () => {
    assert.equal(resolveEventsStatus({ loading: false, error: failure, empty: true }), 'error');
  });

  test('empty after a successful load is empty', () => {
    assert.equal(resolveEventsStatus({ loading: false, error: null, empty: true }), 'empty');
  });
});
