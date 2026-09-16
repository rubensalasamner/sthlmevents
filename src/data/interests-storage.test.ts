import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  EMPTY_INTERESTS,
  parseInterestsSnapshot,
  shouldOfferInterestsPrompt,
} from './interests-storage.js';

describe('parseInterestsSnapshot', () => {
  test('empty / corrupt → defaults', () => {
    assert.deepEqual(parseInterestsSnapshot(null), EMPTY_INTERESTS);
    assert.deepEqual(parseInterestsSnapshot('{'), EMPTY_INTERESTS);
    assert.deepEqual(parseInterestsSnapshot('"nope"'), EMPTY_INTERESTS);
  });

  test('keeps known categories and onboarding status', () => {
    const raw = JSON.stringify({
      categories: ['music', 'bogus', 'food'],
      onboarding: 'completed',
      eventOpenCount: 4,
      favoriteAdds: 2,
    });
    assert.deepEqual(parseInterestsSnapshot(raw), {
      categories: ['music', 'food'],
      onboarding: 'completed',
      eventOpenCount: 4,
      favoriteAdds: 2,
    });
  });
});

describe('shouldOfferInterestsPrompt', () => {
  test('never offers after completed or skipped', () => {
    assert.equal(
      shouldOfferInterestsPrompt({ ...EMPTY_INTERESTS, onboarding: 'completed', favoriteAdds: 9 }),
      false,
    );
    assert.equal(
      shouldOfferInterestsPrompt({ ...EMPTY_INTERESTS, onboarding: 'skipped', eventOpenCount: 9 }),
      false,
    );
  });

  test('offers after 1 favourite add or 3 event opens', () => {
    assert.equal(shouldOfferInterestsPrompt(EMPTY_INTERESTS), false);
    assert.equal(
      shouldOfferInterestsPrompt({ ...EMPTY_INTERESTS, favoriteAdds: 1 }),
      true,
    );
    assert.equal(
      shouldOfferInterestsPrompt({ ...EMPTY_INTERESTS, eventOpenCount: 2 }),
      false,
    );
    assert.equal(
      shouldOfferInterestsPrompt({ ...EMPTY_INTERESTS, eventOpenCount: 3 }),
      true,
    );
  });
});
