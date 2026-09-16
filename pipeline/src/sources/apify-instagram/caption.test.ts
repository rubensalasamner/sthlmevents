import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { extractVenue, looksLikeStockholmPost, parseCaptionDate } from './caption.js';
import { mapInstagramPost, qualityScoreOf } from './mapper.js';
import type { IgPostRaw } from './types.js';

const TODAY = new Date('2026-09-16T08:00:00.000Z'); // a Wednesday
const fixture: IgPostRaw[] = JSON.parse(
  readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'),
) as IgPostRaw[];

function byShortCode(code: string): IgPostRaw {
  return fixture.find((p) => p.shortCode === code)!;
}

test('parseCaptionDate: "11/9 - 08.00-18.00" slash format with times', () => {
  const parsed = parseCaptionDate('När? 11/9 - 08.00-18.00 Var? butiken', TODAY);
  assert.deepEqual(parsed.date, { year: 2026, month: 9, day: 11 });
  assert.equal(parsed.startTime, '08:00');
  assert.equal(parsed.endTime, '18:00');
});

test('parseCaptionDate: "16–17 September" month-name range', () => {
  const parsed = parseCaptionDate('Sample Sale on 16–17 September. Discover baby essentials', TODAY);
  assert.deepEqual(parsed.date, { year: 2026, month: 9, day: 16 });
  assert.deepEqual(parsed.endDate, { year: 2026, month: 9, day: 17 });
});

test('parseCaptionDate: "Fri 25/9 10-18.00" weekday + slash', () => {
  const parsed = parseCaptionDate('Fri 25/9 10-18.00 Sat 26/9 A-HOUSE', TODAY);
  assert.deepEqual(parsed.date, { year: 2026, month: 9, day: 25 });
  assert.equal(parsed.startTime, '10:00');
  assert.equal(parsed.endTime, '18:00');
});

test('parseCaptionDate: "06 Sep 10:00-16:00" day-then-month-word', () => {
  const parsed = parseCaptionDate('06 Sep 10:00-16:00 2 KM long flea market', TODAY);
  assert.deepEqual(parsed.date, { year: 2026, month: 9, day: 6 });
  assert.equal(parsed.startTime, '10:00');
});

test('parseCaptionDate: "imorgon" relative to injected today', () => {
  const parsed = parseCaptionDate('Imorgon 11-15 öppet vi har loppis i Stockholm', TODAY);
  assert.deepEqual(parsed.date, { year: 2026, month: 9, day: 17 });
  assert.equal(parsed.startTime, '11:00');
  assert.equal(parsed.endTime, '15:00');
});

test('parseCaptionDate: roundup captions with no parseable date yield empty', () => {
  const parsed = parseCaptionDate(
    'MY SEPTEMBER BUCKET LIST IN STOCKHOLM autumn markets and outdoor adventures',
    TODAY,
  );
  assert.equal(parsed.date, undefined);
});

test('looksLikeStockholmPost: keeps real events, drops noise and non-events', () => {
  const marimekko = byShortCode('CxMarimekko01');
  const parsedMarimekko = parseCaptionDate(marimekko.caption!, TODAY);
  assert.equal(looksLikeStockholmPost(marimekko, parsedMarimekko), true);

  const giveaway = byShortCode('CxGiveawayXx1');
  const parsedGiveaway = parseCaptionDate(giveaway.caption!, TODAY);
  assert.equal(looksLikeStockholmPost(giveaway, parsedGiveaway), false);

  const roundup = byShortCode('CxBucketListx1');
  const parsedRoundup = parseCaptionDate(roundup.caption!, TODAY);
  assert.equal(looksLikeStockholmPost(roundup, parsedRoundup), false);
});

test('extractVenue: finds the address line with place keywords', () => {
  assert.equal(
    extractVenue(byShortCode('CxMarimekko01').caption!),
    'Stockholm, Biblioteksgatan 5',
  );
  assert.equal(
    extractVenue(byShortCode('CxAxelArigato1').caption!),
    'A-HOUSE UGGELVIKSGATAN 2A',
  );
  assert.equal(extractVenue('no place info at all here'), undefined);
});

test('mapInstagramPost: builds a StockholmEvent from caption data', () => {
  const post = byShortCode('CxLoppis2km01');
  const parsed = parseCaptionDate(post.caption!, TODAY);
  const event = mapInstagramPost(post, parsed);
  assert.equal(event.id, 'apify-instagram:CxLoppis2km01');
  assert.equal(event.source, 'apify-instagram');
  assert.equal(event.category, 'popup');
  assert.match(event.startsAt, /^2026-09-06T/);
  assert.equal(event.venue.name, '2 kilometer Loppis Hägerstensvägen 100-180, Stockholm');
  assert.ok(event.qualityScore > 0);
  assert.equal(event.sourceUrl, 'https://www.instagram.com/p/CxLoppis2km01/');
});

test('mapInstagramPost: month-name range sets endsAt', () => {
  const post = byShortCode('CxBabySale0001');
  const parsed = parseCaptionDate(post.caption!, TODAY);
  const event = mapInstagramPost(post, parsed);
  // Midnight Stockholm = 22:00Z the previous day (CEST, UTC+2).
  assert.match(event.startsAt, /^2026-09-15T22:00:00/);
  assert.match(event.endsAt ?? '', /^2026-09-16T22:00:00/);
});

test('qualityScoreOf: engagement + image + caption length, capped at 100', () => {
  const rich: IgPostRaw = { likesCount: 342, commentsCount: 28, imageUrl: 'x', caption: 'a'.repeat(200) };
  const bare: IgPostRaw = { caption: 'short' };
  assert.equal(qualityScoreOf(rich), 100);
  assert.ok(qualityScoreOf(bare) < 20);
});
