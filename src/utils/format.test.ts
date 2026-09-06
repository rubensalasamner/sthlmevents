import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { ticketCtaLabel, venueLine } from './format.js';

describe('venueLine', () => {
  test('joins non-empty parts and drops blanks', () => {
    assert.equal(venueLine(['Hornstull', 'Bergsunds strand 43', 'Södermalm']), 'Hornstull, Bergsunds strand 43, Södermalm');
  });

  test('skips undefined, null and whitespace-only parts', () => {
    assert.equal(venueLine(['Kulturhuset', undefined, 'Norrmalm']), 'Kulturhuset, Norrmalm');
    assert.equal(venueLine(['A', '', '  ', 'B']), 'A, B');
    assert.equal(venueLine([]), '');
  });
});

describe('ticketCtaLabel', () => {
  test('account-required sources get a neutral view label', () => {
    assert.equal(ticketCtaLabel({ requiresAccount: true, priceSek: undefined }), 'View on organizer site');
    assert.equal(ticketCtaLabel({ requiresAccount: true, priceSek: 0 }), 'View on organizer site');
    assert.equal(ticketCtaLabel({ requiresAccount: true, priceSek: 150 }), 'View on organizer site');
  });

  test('free events without account requirement link to the event page', () => {
    assert.equal(ticketCtaLabel({ requiresAccount: undefined, priceSek: 0 }), 'Event page');
  });

  test('paid events keep the purchase framing', () => {
    assert.equal(ticketCtaLabel({ requiresAccount: undefined, priceSek: 275 }), 'Get tickets');
    assert.equal(ticketCtaLabel({ requiresAccount: undefined, priceSek: undefined }), 'Get tickets');
  });
});
