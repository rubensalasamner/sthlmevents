import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import { orderFeed, feedTier } from '@/utils/ranking';
import { collapseSeries } from '@/utils/collapse-series';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'other',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-12T18:00:00.000Z',
    venue: { name: 'v', address: '', district: 'd' },
    organizer: 'o',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

// Sunday 2026-09-13 10:51 Stockholm (CEST) → 08:51Z — the user's bug report.
const NOW = new Date('2026-09-13T08:51:00.000Z');

describe('feedTier', () => {
  test('classifies upcoming, ongoing, past', () => {
    assert.equal(feedTier(event({ startsAt: '2026-09-14T10:00:00Z' }), NOW), 'upcoming');
    assert.equal(feedTier(event({ startsAt: '2026-09-12T22:00Z', endsAt: '2026-09-13T21:59Z' }), NOW), 'ongoing');
    assert.equal(feedTier(event({ startsAt: '2026-09-10T18:00Z' }), NOW), 'past');
  });
});

describe('orderFeed — the reported bug', () => {
  test('ongoing events order by end date: dying-today above months-long', () => {
    const mammaMia = event({
      id: 'mamma',
      title: 'MAMMA MIA! THE PARTY',
      startsAt: '2026-09-12T17:30:00.000Z',
      endsAt: '2026-11-28T22:59:00.000Z',
      qualityScore: 55,
    });
    const ildance = event({
      id: 'ildance',
      title: 'ilDance Event',
      startsAt: '2026-09-12T22:00:00.000Z',
      endsAt: '2026-09-13T21:59:00.000Z',
      qualityScore: 50,
    });
    assert.deepEqual(orderFeed([mammaMia, ildance], NOW).map((e) => e.id), ['ildance', 'mamma']);
  });

  test('upcoming today beats ongoing even at lower quality', () => {
    const gigTonight = event({ id: 'gig', startsAt: '2026-09-13T19:00Z', qualityScore: 30 });
    const longRun = event({ id: 'run', startsAt: '2026-09-10T10:00Z', endsAt: '2026-09-14T18:00Z', qualityScore: 90 });
    assert.deepEqual(orderFeed([longRun, gigTonight], NOW).map((e) => e.id), ['gig', 'run']);
  });

  test('"All" mode: timeline order — today first, ongoing by end, past last', () => {
    const futureNov = event({ id: 'nov', startsAt: '2026-11-28T17:00Z', qualityScore: 95 });
    const ongoingEndingToday = event({ id: 'ending', startsAt: '2026-09-12T22:00Z', endsAt: '2026-09-13T21:59Z' });
    const ongoingLong = event({ id: 'long', startsAt: '2026-09-12T17:30Z', endsAt: '2026-11-28T22:59Z' });
    const past = event({ id: 'past', startsAt: '2026-09-10T18:00Z' });
    assert.deepEqual(orderFeed([ongoingLong, futureNov, past, ongoingEndingToday], NOW).map((e) => e.id), [
      'nov',
      'ending',
      'past',
      'long',
    ]);
  });

  test('featured leads within its band only', () => {
    const featuredLongRun = event({ id: 'feat', isFeatured: true, startsAt: '2026-09-01T10:00Z', endsAt: '2026-12-01T18:00Z' });
    const gigTonight = event({ id: 'gig', startsAt: '2026-09-13T19:00Z' });
    assert.deepEqual(orderFeed([featuredLongRun, gigTonight], NOW).map((e) => e.id), ['gig', 'feat']);
  });

  test('preferred categories soft-boost within the same tier', () => {
    const art = event({ id: 'art', category: 'art', startsAt: '2026-09-13T18:00Z', qualityScore: 90 });
    const music = event({ id: 'music', category: 'music', startsAt: '2026-09-13T20:00Z', qualityScore: 40 });
    assert.deepEqual(orderFeed([music, art], NOW).map((e) => e.id), ['art', 'music']);
    assert.deepEqual(
      orderFeed([music, art], NOW, { preferredCategories: new Set(['music']) }).map((e) => e.id),
      ['music', 'art'],
    );
  });

  test('interest boost does not beat upcoming over past', () => {
    const preferredPast = event({
      id: 'past-music',
      category: 'music',
      startsAt: '2026-09-10T18:00Z',
    });
    const upcomingOther = event({
      id: 'soon',
      category: 'art',
      startsAt: '2026-09-13T19:00Z',
    });
    assert.deepEqual(
      orderFeed([preferredPast, upcomingOther], NOW, {
        preferredCategories: new Set(['music']),
      }).map((e) => e.id),
      ['soon', 'past-music'],
    );
  });

  test('band order: dying-tonight programme → out-of-town → long-running', () => {
    // ~15 km öster om Sergels torg → utanför LOCAL_RADIUS_KM (10 km).
    const farVenue = { name: 'v', address: '', district: 'd', latitude: 59.3311, longitude: 18.0593 + 15 / 57.6 };
    const dyingTonight = event({ id: 'tonight', startsAt: '2026-09-12T22:00Z', endsAt: '2026-09-13T21:59Z' });
    const awayGig = event({ id: 'away', startsAt: '2026-09-13T15:00Z', venue: farVenue });
    const monthsRun = event({ id: 'fixture', startsAt: '2026-08-01T10:00Z', endsAt: '2026-12-01T18:00Z' });
    assert.deepEqual(orderFeed([monthsRun, awayGig, dyingTonight], NOW).map((e) => e.id), [
      'tonight',
      'away',
      'fixture',
    ]);
  });

  test('quality breaks date ties, then id is deterministic', () => {
    const a = event({ id: 'a', startsAt: '2026-09-13T19:00Z', qualityScore: 40 });
    const b = event({ id: 'b', startsAt: '2026-09-13T19:00Z', qualityScore: 60 });
    assert.deepEqual(orderFeed([a, b], NOW).map((e) => e.id), ['b', 'a']);
  });
});

describe('orderFeed with collapsed series (snapshot realism)', () => {
  test('recurring MAMMA MIA series fronts on live occurrence, orders as ongoing', () => {
    const occurrences: StockholmEvent[] = [
      event({ id: 'mm-1', title: 'MAMMA MIA! THE PARTY', startsAt: '2026-09-12T17:30Z', endsAt: '2026-11-28T22:59Z' }),
      event({ id: 'mm-2', title: 'MAMMA MIA! THE PARTY', startsAt: '2026-10-25T13:00Z', endsAt: '2026-10-25T22:59Z' }),
      event({ id: 'mm-3', title: 'MAMMA MIA! THE PARTY', startsAt: '2026-12-31T18:30Z', endsAt: '2026-12-31T22:59Z' }),
    ];
    const { events: collapsed } = collapseSeries(occurrences, { now: NOW });
    assert.equal(collapsed.length, 1);
    const gigTonight = event({ id: 'gig', title: 'Another gig', startsAt: '2026-09-13T19:00Z' });
    const ordered = orderFeed([collapsed[0]!, gigTonight], NOW);
    assert.deepEqual(ordered.map((e) => e.id), ['gig', 'mm-1']);
  });
});
