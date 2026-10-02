import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { activeFilterFacets, filterSummaryLabel } from './filter-label.js';

describe('activeFilterFacets', () => {
  test('omits date and skips defaults', () => {
    assert.deepEqual(
      activeFilterFacets({ category: 'all', nearMe: false, nearRadiusKm: null, query: '' }),
      [],
    );
  });

  test('lists category, near, and query', () => {
    assert.deepEqual(
      activeFilterFacets({
        category: 'music',
        nearMe: true,
        nearRadiusKm: 2,
        query: 'jazz',
      }),
      [
        { id: 'category', label: 'Music' },
        { id: 'near', label: '≤ 2 km' },
        { id: 'query', label: 'jazz' },
      ],
    );
  });
});

describe('filterSummaryLabel', () => {
  test('includes the date window', () => {
    assert.match(
      filterSummaryLabel({
        dateRange: 'weekend',
        category: 'all',
        nearMe: false,
        nearRadiusKm: null,
        query: '',
      }),
      /weekend/i,
    );
  });
});
