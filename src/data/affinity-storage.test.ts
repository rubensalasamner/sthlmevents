import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  appendAffinitySignal,
  MAX_AFFINITY_SIGNALS,
  parseAffinitySnapshot,
  unfollowVenue,
} from '@/data/affinity-storage';

describe('parseAffinitySnapshot', () => {
  test('tolerates garbage', () => {
    assert.deepEqual(parseAffinitySnapshot(null).signals, []);
    assert.deepEqual(parseAffinitySnapshot('{').signals, []);
  });

  test('keeps valid signals and follow lists', () => {
    const raw = JSON.stringify({
      signals: [{ kind: 'open', key: 'music', at: 1 }],
      followedVenues: ['dramaten'],
      followedOrganizers: ['foo'],
    });
    const parsed = parseAffinitySnapshot(raw);
    assert.equal(parsed.signals.length, 1);
    assert.deepEqual(parsed.followedVenues, ['dramaten']);
  });
});

describe('appendAffinitySignal', () => {
  test('caps signal list and records follows', () => {
    let snap = parseAffinitySnapshot(null);
    for (let i = 0; i < MAX_AFFINITY_SIGNALS + 5; i += 1) {
      snap = appendAffinitySignal(snap, { kind: 'open', key: 'music', at: i });
    }
    assert.equal(snap.signals.length, MAX_AFFINITY_SIGNALS);
    snap = appendAffinitySignal(snap, { kind: 'follow_venue', key: 'cirkus', at: 99 });
    assert.ok(snap.followedVenues.includes('cirkus'));
    snap = unfollowVenue(snap, 'cirkus');
    assert.equal(snap.followedVenues.includes('cirkus'), false);
  });
});
