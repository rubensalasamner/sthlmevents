import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { mapFacebookEvent, qualityScoreOf } from './mapper.js';
import { looksLikeStockholmEvent as isStockholmEvent } from './mapper.js';
import type { ApifyFbEventRaw } from './types.js';

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL('./fixture.json', import.meta.url)), 'utf8'),
) as ApifyFbEventRaw[];

function row(name: string): ApifyFbEventRaw {
  const found = fixture.find((r) => r.name === name);
  assert.ok(found, `fixture row "${name}" missing`);
  return found;
}

describe('apify-facebook adapter filter', () => {
  it('keeps Stockholm venues regardless of city spelling (Sverige vs Sweden)', () => {
    assert.equal(isStockholmEvent(row('STOR BEAUTY-UTFÖRSÄLJNING!')), true);
    assert.equal(isStockholmEvent(row('PICK A POPPY SAMPLE SALE🎀')), true);
  });

  it('keeps SE venues whose name is the venue itself (Stockholmsmässan)', () => {
    assert.equal(isStockholmEvent(row('Le Creuset Pop-up Outlet Sale - Stockholm')), true);
  });

  it('drops foreign-country events even with high interest (Melbourne, 409)', () => {
    assert.equal(isStockholmEvent(row('Korean Cosmetics Pop-Up Sale | October 15 - 18 | Melbourne')), false);
  });

  it('drops US events', () => {
    assert.equal(isStockholmEvent(row('pop up sale')), false);
    assert.equal(isStockholmEvent(row('Pop- Up Sale')), false);
  });

  it('keeps title-only rows whose title says Stockholm (Adoore, no location in payload)', () => {
    const adoore: ApifyFbEventRaw = { ...row('SAMPLE SALE STOCKHOLM'), 'location.countryCode': null };
    assert.equal(isStockholmEvent(adoore), true);
  });

  it('drops rows whose TITLE names a foreign city even without location fields', () => {
    const melbourneTitleOnly: ApifyFbEventRaw = {
      ...row('Korean Cosmetics Pop-Up Sale | October 15 - 18 | Melbourne'),
      'location.name': null,
      'location.countryCode': null,
    };
    assert.equal(isStockholmEvent(melbourneTitleOnly), false);
  });
});

describe('apify-facebook mapper', () => {
  it('maps the flagship ARAKII row end to end', () => {
    const mapped = mapFacebookEvent(row('ARAKII Sample Sale'));
    assert.equal(mapped.id, 'apify-facebook:3971815706447425');
    assert.equal(mapped.source, 'apify-facebook');
    assert.equal(mapped.sourceId, '3971815706447425');
    assert.equal(mapped.title, 'ARAKII Sample Sale');
    assert.equal(mapped.category, 'popup');
    assert.equal(mapped.startsAt, '2026-09-17T06:00:00.000Z');
    assert.equal(mapped.endsAt, '2026-09-21T06:00:00.000Z'); // 4 days
    assert.equal(mapped.venue.address, 'Uggelviksgatan 2A, SE-114 27 Stockholm, Sverige');
    assert.equal(mapped.organizer, 'Slash.ten');
    assert.equal(mapped.sourceUrl, 'https://www.facebook.com/events/3971815706447425/');
    assert.ok(mapped.imageUrl.startsWith('https://scontent'));
  });

  it('parses hour durations ("6 hr")', () => {
    const raw = row('Pop- Up Sale');
    const mapped = mapFacebookEvent(raw);
    assert.equal(mapped.endsAt, '2026-10-18T20:00:00.000Z');
  });

  it('leaves endsAt undefined when duration is null', () => {
    const mapped = mapFacebookEvent(row('pop up sale'));
    assert.equal(mapped.endsAt, undefined);
  });

  it('strips the "Event by" prefix from organizer', () => {
    const mapped = mapFacebookEvent(row('PICK A POPPY SAMPLE SALE🎀'));
    assert.equal(mapped.organizer, 'PICK A POPPY');
  });

  it('rows without imageUrl keep a non-empty image (fallback)', () => {
    const mapped = mapFacebookEvent(row('SAMPLE SALE STOCKHOLM'));
    assert.ok(mapped.imageUrl.length > 0);
    assert.ok(!mapped.imageUrl.includes('fbcdn'));
  });
});

describe('apify-facebook quality score', () => {
  it('ranks the fixture by real interest', () => {
    const arakii = qualityScoreOf(row('ARAKII Sample Sale')); // 1298 interest
    const pickAPoppy = qualityScoreOf(row('PICK A POPPY SAMPLE SALE🎀')); // 706
    const beauty = qualityScoreOf(row('STOR BEAUTY-UTFÖRSÄLJNING!')); // 71
    const melbourne = qualityScoreOf(row('Korean Cosmetics Pop-Up Sale | October 15 - 18 | Melbourne'));
    assert.equal(arakii, 90); // saturates: 70 (interest capped) + 20 (image)
    assert.equal(pickAPoppy, 90); // same cap — top events are interchangeable
    assert.ok(pickAPoppy > beauty);
    assert.equal(beauty, 45); // 71 interest -> 25 + 20
    assert.ok(melbourne > 60); // high interest still scores (filter is separate)
  });

  it('noise with no image/description stays low', () => {
    assert.ok(qualityScoreOf({ ...row('pop up sale'), imageUrl: undefined }) <= 5);
  });
});
