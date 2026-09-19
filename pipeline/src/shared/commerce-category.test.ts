import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { inferCommerceCategory } from './commerce-category.js';

describe('inferCommerceCategory', () => {
  test('routes sales and pop-ups to popup', () => {
    assert.equal(inferCommerceCategory('DEDICATED Sample Sale Södermalm'), 'popup');
    assert.equal(inferCommerceCategory('Stor utförsäljning i A-House'), 'popup');
    assert.equal(inferCommerceCategory('Brand pop-up this weekend'), 'popup');
  });

  test('routes flea markets and loppis to market', () => {
    assert.equal(inferCommerceCategory('Hornstulls loppis'), 'market');
    assert.equal(inferCommerceCategory('Julmarknad på Skansen'), 'market');
    assert.equal(inferCommerceCategory('Weekend flea market'), 'market');
  });

  test('sample sale wins over market wording in the same string', () => {
    assert.equal(inferCommerceCategory('Sample sale at the weekend market hall'), 'popup');
  });

  test('returns null without a commerce signal', () => {
    assert.equal(inferCommerceCategory('Konsert på Kafé 44'), null);
  });
});
