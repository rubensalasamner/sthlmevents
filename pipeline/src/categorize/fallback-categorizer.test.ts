import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { EventCategory } from '../shared/event.js';
import type { BatchCategorizer } from './categorizer.js';
import { FallbackCategorizer } from './fallback-categorizer.js';

function stub(
  classify: (inputs: readonly string[]) => Promise<(EventCategory | null)[]>,
  calls = { count: 0 },
): BatchCategorizer {
  return {
    async categorize(inputs: readonly string[]) {
      calls.count += 1;
      return classify(inputs);
    },
  };
}

describe('FallbackCategorizer', () => {
  test('returns the first categorizer success', async () => {
    const primary = stub(async (inputs) => inputs.map(() => 'music'));
    const secondary = stub(async () => {
      throw new Error('should not be called');
    });
    const fallback = new FallbackCategorizer([primary, secondary]);

    assert.deepEqual(await fallback.categorize(['a', 'b']), ['music', 'music']);
  });

  test('demotes a failing categorizer for the rest of the run', async () => {
    const calls = { count: 0 };
    const flaky = stub(
      async () => {
        throw new Error('categorizer API 404: model decommissioned');
      },
      calls,
    );
    const stable = stub(async (inputs) => inputs.map(() => 'art'));
    const fallback = new FallbackCategorizer([flaky, stable]);

    assert.deepEqual(await fallback.categorize(['a']), ['art']);
    assert.deepEqual(await fallback.categorize(['b']), ['art'], 'second batch skips the dead primary');
    assert.equal(calls.count, 1, 'primary is called once, then demoted');
  });

  test('demoted categorizer rotates to the back and returns later', async () => {
    const calls = { count: 0 };
    const flaky = stub(
      async (inputs) => {
        if (calls.count === 1) throw new Error('boom');
        return inputs.map(() => null);
      },
      calls,
    );
    const stable = stub(async () => {
      throw new Error('down too');
    });
    const fallback = new FallbackCategorizer([flaky, stable]);

    await assert.rejects(fallback.categorize(['a']), /down too/);
    // Rotation put flaky back in front; recovered, it serves batch two.
    assert.deepEqual(await fallback.categorize(['b']), [null]);
    assert.equal(calls.count, 2, 'demotion rotated the order, it did not remove the categorizer');
  });

  test('throws the last error when every categorizer fails', async () => {
    const fallback = new FallbackCategorizer([
      stub(async () => {
        throw new Error('first failed');
      }),
      stub(async () => {
        throw new Error('second failed');
      }),
    ]);

    await assert.rejects(fallback.categorize(['a']), /second failed/);
  });

  test('requires at least one categorizer', () => {
    assert.throws(() => new FallbackCategorizer([]), /at least one/);
  });

  test('empty input never touches a categorizer', async () => {
    const calls = { count: 0 };
    const primary = stub(async () => [], calls);
    const fallback = new FallbackCategorizer([primary]);

    assert.deepEqual(await fallback.categorize([]), []);
    assert.equal(calls.count, 0);
  });
});
