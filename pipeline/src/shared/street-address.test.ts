import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  extractStreetAddress,
  isHashtagVenue,
  isPostalCodeVenue,
} from './street-address.js';

describe('extractStreetAddress', () => {
  test('pulls street+number from brand-prefixed and multi-line captions', () => {
    assert.equal(
      extractStreetAddress('Dedicated HQ, Tjurbergsgatan 29 Södermalm.'),
      'Tjurbergsgatan 29',
    );
    assert.equal(
      extractStreetAddress('Marimekko Norrmalmstorg Stockholm, Norrmalmstorg 4'),
      'Norrmalmstorg 4',
    );
    assert.equal(
      extractStreetAddress(
        'Sample Sale at Flattered HQ, Erik Dahlbergsallén 15, 1st floor, Stockholm.',
      ),
      'Dahlbergsallén 15',
    );
    assert.equal(
      extractStreetAddress('Skyddsrummet\nSöder Mälarstrand 25\n118 25 Stockholm'),
      'Söder Mälarstrand 25',
    );
    assert.equal(extractStreetAddress('A-HOUSE UGGELVIKSGATAN 2A'), 'UGGELVIKSGATAN 2A');
    assert.equal(extractStreetAddress('Mosebacke torg 1-3'), 'Mosebacke torg 1');
    assert.equal(extractStreetAddress('St Eriksgatan 79, Stockholm'), 'St Eriksgatan 79');
  });

  test('returns undefined without a street+number', () => {
    assert.equal(extractStreetAddress('#samplesale #stockholm'), undefined);
    assert.equal(extractStreetAddress('118 25 Stockholm'), undefined);
  });
});

describe('venue noise helpers', () => {
  test('detects hashtag soup and postal-only lines', () => {
    assert.equal(isHashtagVenue('#samplesale #utförsäljning'), true);
    assert.equal(isHashtagVenue('Birkagatan 29'), false);
    assert.equal(isPostalCodeVenue('118 25 Stockholm'), true);
    assert.equal(isPostalCodeVenue('Söder Mälarstrand 25'), false);
  });
});
