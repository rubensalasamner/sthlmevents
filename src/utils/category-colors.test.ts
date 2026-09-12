import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { EVENT_CATEGORIES } from '@/types/event';
import { BADGE_INK, CATEGORY_BADGE_COLORS } from '@/utils/category-colors';

describe('CATEGORY_BADGE_COLORS', () => {
  test('covers every category', () => {
    for (const category of EVENT_CATEGORIES) {
      assert.match(CATEGORY_BADGE_COLORS[category], /^#[0-9A-F]{6}$/i, category);
    }
  });

  test('music is the ice-blue accent from the design round', () => {
    assert.equal(CATEGORY_BADGE_COLORS.music, '#7CD4FF');
  });

  test('badge ink is dark for contrast on light badge hues', () => {
    assert.equal(BADGE_INK, '#06121C');
  });
});
