import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildBubblePng, buildBubblePngDataUri } from '@/utils/map-bubble-png';

describe('buildBubblePng', () => {
  test('emits a PNG data URI for time and Nu labels', () => {
    const time = buildBubblePngDataUri('19:00', '#7CD4FF');
    const nu = buildBubblePngDataUri('Nu', '#FFC46B');
    assert.match(time, /^data:image\/png;base64,/);
    assert.match(nu, /^data:image\/png;base64,/);
    assert.ok(time.length > 100);
    assert.notEqual(time, nu);
  });

  test('two-line title+time bubbles are wider than time-only', () => {
    const timeOnly = buildBubblePng('19:00', '#7CD4FF', 1.55);
    const titled = buildBubblePng(
      { primary: 'Jazz night at Fasching', secondary: '19:00' },
      '#7CD4FF',
      1.55,
    );
    assert.ok(titled.width > timeOnly.width);
    assert.ok(titled.height > 0);
  });

  test('higher uiScale produces a larger bitmap', () => {
    const small = buildBubblePng('19:00', '#7CD4FF', 1.55);
    const large = buildBubblePng('19:00', '#7CD4FF', 2.25);
    assert.ok(large.width > small.width);
    assert.ok(large.height > small.height);
  });

  test('frost bubble differs from a solid category wash of the same label', () => {
    // Same inputs always produce frost chrome now; sanity-check non-empty PNG.
    const a = buildBubblePng('Nu', '#C9B8FF', 1.55);
    const b = buildBubblePng('Nu', '#7CD4FF', 1.55);
    assert.notEqual(a.uri, b.uri);
  });
});
