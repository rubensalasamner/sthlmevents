import assert from 'node:assert/strict';
import { test } from 'node:test';

import { analyze, flagPost, type IgPost } from './ig-analyze.js';

function post(overrides: Partial<IgPost>): IgPost {
  return { caption: '', ...overrides };
}

test('flags Stockholm by caption mentions', () => {
  const f = flagPost(post({ caption: 'Sample sale på Södermalm imorgon!' }));
  assert.equal(f.isStockholm, true);
});

test('flags Stockholm by district and foreign titles rejected', () => {
  assert.equal(flagPost(post({ caption: 'Loppis i Vasastan på lördag' })).isStockholm, true);
  assert.equal(flagPost(post({ caption: 'Sample sale in Ottawa this weekend' })).isStockholm, false);
});

test('detects Swedish date-range signals in captions', () => {
  const cases: [string, boolean][] = [
    ['Fri 25/9 10-18.00', true],
    ['öppet 23–24 sep', true],
    ['16–17 September', true],
    ['imorgon kl 11', true],
    ['ny kollektion ute nu', false],
    ['', false],
  ];
  for (const [caption, expected] of cases) {
    assert.equal(flagPost(post({ caption })).hasDateSignal, expected, caption);
  }
});

test('detects price and noise signals', () => {
  const f = flagPost(post({ caption: 'Fri entré! Länk i bio #ad' }));
  assert.equal(f.hasPriceSignal, true);
  assert.equal(f.isNoise, true);
});

test('analyze handles empty input', () => {
  assert.doesNotThrow(() => analyze([]));
});

test('analyze prints a summary without crashing on real-ish data', () => {
  const posts: IgPost[] = [
    post({ caption: 'Sample Sale Stockholm 25/9 10-18 A-HOUSE', likesCount: 120 }),
    post({ caption: 'giveaway vinst 100kr länk i bio' }),
  ];
  assert.doesNotThrow(() => analyze(posts));
});
