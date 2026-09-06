import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { haversineKm, jaroWinkler, levenshtein, levenshteinRatio, normalizeTitle } from './similarity.js';

describe('normalizeTitle', () => {
  test('folds case, diacritics and punctuation', () => {
    assert.equal(normalizeTitle('Dalendagen 2026!'), 'dalendagen 2026');
    assert.equal(normalizeTitle('Trädgården — Säsong'), 'tradgarden sasong');
    assert.equal(normalizeTitle('LOPPIS  i   Kista'), 'loppis i kista');
  });
});

describe('levenshtein', () => {
  test('counts single-edit distances', () => {
    assert.equal(levenshtein('kitten', 'sitting'), 3);
    assert.equal(levenshtein('abc', 'abc'), 0);
    assert.equal(levenshtein('', 'abc'), 3);
  });

  test('ratio is 1 for equal strings and high for a single edit', () => {
    assert.equal(levenshteinRatio('', ''), 1);
    assert.equal(levenshteinRatio('techno', 'techno'), 1);
    assert.ok(levenshteinRatio('techno night', 'techno nights') > 0.9);
    assert.ok(levenshteinRatio('techno night', 'poetry slam') < 0.4);
  });
});

describe('jaroWinkler', () => {
  test('rewards shared prefixes', () => {
    assert.equal(jaroWinkler('tradgarden', 'tradgarden'), 1);
    assert.ok(jaroWinkler('tradgarden', 'tradgard') > 0.9);
    assert.ok(jaroWinkler('slakthuset', 'slaktkyrkan') < 0.9);
  });
});

describe('haversineKm', () => {
  test('is ~0 for identical points and small for nearby venues', () => {
    assert.ok(haversineKm(59.3, 18.07, 59.3, 18.07) < 1e-9);
    // Trädgården (59.3045,18.0785) to Slakthuset (59.2918,18.0794) ~1.4 km.
    const d = haversineKm(59.304501, 18.078484, 59.291777, 18.079366);
    assert.ok(d > 1 && d < 2, `expected ~1.4 km, got ${d}`);
  });
});
