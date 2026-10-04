import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  fallbackImageFor,
  isCategoryFallbackImage,
  isPlausibleImageUrl,
} from './images.js';

describe('isPlausibleImageUrl', () => {
  test('accepts normal image URLs and Unsplash placeholders', () => {
    assert.equal(isPlausibleImageUrl('https://cdn.example/hero.jpg'), true);
    assert.equal(isPlausibleImageUrl('https://cdn.example/a.PNG?w=800'), true);
    assert.equal(
      isPlausibleImageUrl('https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=1200'),
      true,
    );
    assert.equal(
      isPlausibleImageUrl(
        'https://kulturhusetstadsteatern.se/sites/default/files/2026-05/Omfamnad.jpg',
      ),
      true,
    );
  });

  test('rejects Kulturhuset tix buying-flow og:image values', () => {
    assert.equal(
      isPlausibleImageUrl(
        'https://tix.kulturhusetstadsteatern.se/sv/buyingflow/tickets/30042/123595/Kulturhuset%20Stadsteatern',
      ),
      false,
    );
    assert.equal(
      isPlausibleImageUrl('https://shop.example/buyingflow/tickets/1'),
      false,
    );
  });

  test('rejects bare page URLs without media hints', () => {
    assert.equal(isPlausibleImageUrl('https://bondensegen.com/stockholm/'), false);
    assert.equal(isPlausibleImageUrl('not-a-url'), false);
  });
});

describe('isCategoryFallbackImage', () => {
  test('detects Unsplash category placeholders only', () => {
    assert.equal(isCategoryFallbackImage(fallbackImageFor('art')), true);
    assert.equal(isCategoryFallbackImage(fallbackImageFor('family')), true);
    assert.equal(isCategoryFallbackImage('https://cdn.example/hero.jpg'), false);
  });
});
