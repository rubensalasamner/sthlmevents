import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { eventShareUrl, webAppOrigin } from './event-share-url.js';

describe('eventShareUrl', () => {
  test('builds an https path with encoded id', () => {
    assert.equal(
      eventShareUrl({ id: 'ticketmaster:Z7r9jZ1A' }, 'https://sthlmevents.vercel.app'),
      'https://sthlmevents.vercel.app/event/ticketmaster%3AZ7r9jZ1A',
    );
  });

  test('strips trailing slash on origin', () => {
    assert.equal(
      eventShareUrl({ id: 'a:1' }, 'https://example.com/'),
      'https://example.com/event/a%3A1',
    );
  });

  test('falls back to custom scheme when no origin', () => {
    assert.equal(eventShareUrl({ id: 'a:1' }, null), 'sthlmevents://event/a%3A1');
  });
});

describe('webAppOrigin', () => {
  test('reads EXPO_PUBLIC_WEB_ORIGIN', () => {
    const prev = process.env.EXPO_PUBLIC_WEB_ORIGIN;
    process.env.EXPO_PUBLIC_WEB_ORIGIN = 'https://app.example/';
    try {
      assert.equal(webAppOrigin(), 'https://app.example');
    } finally {
      if (prev === undefined) delete process.env.EXPO_PUBLIC_WEB_ORIGIN;
      else process.env.EXPO_PUBLIC_WEB_ORIGIN = prev;
    }
  });

  test('derives from snapshot URL on same host', () => {
    const prevWeb = process.env.EXPO_PUBLIC_WEB_ORIGIN;
    const prevSnap = process.env.EXPO_PUBLIC_SNAPSHOT_URL;
    delete process.env.EXPO_PUBLIC_WEB_ORIGIN;
    process.env.EXPO_PUBLIC_SNAPSHOT_URL = 'https://sthlmevents.vercel.app/events.snapshot.json';
    try {
      assert.equal(webAppOrigin(), 'https://sthlmevents.vercel.app');
    } finally {
      if (prevWeb === undefined) delete process.env.EXPO_PUBLIC_WEB_ORIGIN;
      else process.env.EXPO_PUBLIC_WEB_ORIGIN = prevWeb;
      if (prevSnap === undefined) delete process.env.EXPO_PUBLIC_SNAPSHOT_URL;
      else process.env.EXPO_PUBLIC_SNAPSHOT_URL = prevSnap;
    }
  });
});
