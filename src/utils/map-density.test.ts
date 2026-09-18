import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { StockholmEvent } from '@/types/event';
import {
  boundsAround,
  boundsFromDeltas,
  cameraMovedEnough,
  clusterCellDeg,
  MAP_CLUSTER_BELOW_ZOOM,
  MAP_PIN_CAP,
  pointInBounds,
  visibleMapPins,
  type MapCameraSnapshot,
} from '@/utils/map-density';

function event(overrides: Partial<StockholmEvent> = {}): StockholmEvent {
  return {
    id: 'x',
    title: 'Title',
    description: '',
    category: 'music',
    imageUrl: 'https://fallback/x.jpg',
    startsAt: '2026-09-16T17:00:00.000Z',
    venue: { name: 'v', address: '', district: 'd', latitude: 59.33, longitude: 18.07 },
    organizer: 'o',
    source: 's',
    sourceId: 'id',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isFeatured: false,
    qualityScore: 50,
    ...overrides,
  };
}

const CENTER = { latitude: 59.33, longitude: 18.07 };

function camera(overrides: Partial<MapCameraSnapshot> = {}): MapCameraSnapshot {
  const zoom = overrides.zoom ?? 13;
  const center = overrides.center ?? CENTER;
  return {
    center,
    zoom,
    bounds: overrides.bounds ?? boundsAround(center, zoom),
  };
}

describe('boundsFromDeltas', () => {
  test('centers a lat/lng box on the camera', () => {
    const bounds = boundsFromDeltas(CENTER, 0.02, 0.04);
    assert.equal(bounds.north, CENTER.latitude + 0.01);
    assert.equal(bounds.south, CENTER.latitude - 0.01);
    assert.equal(bounds.east, CENTER.longitude + 0.02);
    assert.equal(bounds.west, CENTER.longitude - 0.02);
  });
});

describe('pointInBounds', () => {
  test('includes the center and excludes a far point', () => {
    const bounds = boundsFromDeltas(CENTER, 0.02, 0.02);
    assert.equal(pointInBounds(CENTER, bounds), true);
    assert.equal(pointInBounds({ latitude: 59.5, longitude: 18.07 }, bounds), false);
  });
});

describe('clusterCellDeg', () => {
  test('doubles each integer zoom-out below 12', () => {
    assert.equal(clusterCellDeg(12), 0.012);
    assert.equal(clusterCellDeg(11), 0.024);
    assert.equal(clusterCellDeg(10), 0.048);
  });
});

describe('cameraMovedEnough', () => {
  test('ignores sub-threshold pans', () => {
    const prev = camera();
    const next = camera({
      center: { latitude: CENTER.latitude + 0.00001, longitude: CENTER.longitude },
    });
    assert.equal(cameraMovedEnough(prev, next), false);
  });

  test('commits a zoom step of 0.2', () => {
    assert.equal(cameraMovedEnough(camera({ zoom: 13 }), camera({ zoom: 13.2 })), true);
  });
});

describe('visibleMapPins', () => {
  test('drops events outside the viewport', () => {
    const inside = event({ id: 'in' });
    const outside = event({
      id: 'out',
      venue: { name: 'v', address: '', district: 'd', latitude: 59.9, longitude: 18.07 },
    });
    const pins = visibleMapPins([inside, outside], camera({ zoom: 14 }));
    assert.deepEqual(
      pins.filter((pin) => pin.kind === 'event').map((pin) => pin.id),
      ['in'],
    );
  });

  test('clusters overlapping events when zoomed out', () => {
    const a = event({
      id: 'a',
      venue: { name: 'v', address: '', district: 'd', latitude: 59.3301, longitude: 18.0701 },
    });
    const b = event({
      id: 'b',
      venue: { name: 'v', address: '', district: 'd', latitude: 59.3302, longitude: 18.0702 },
    });
    const far = event({
      id: 'c',
      venue: { name: 'v', address: '', district: 'd', latitude: 59.37, longitude: 18.12 },
    });
    const pins = visibleMapPins([a, b, far], camera({ zoom: MAP_CLUSTER_BELOW_ZOOM - 1 }));
    const clusters = pins.filter((pin) => pin.kind === 'cluster');
    const singles = pins.filter((pin) => pin.kind === 'event');
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0]?.count, 2);
    assert.deepEqual(
      singles.map((pin) => pin.id),
      ['c'],
    );
  });

  test('caps expanded pins to the nearest N', () => {
    const events = Array.from({ length: MAP_PIN_CAP + 8 }, (_, i) =>
      event({
        id: `e${i}`,
        venue: {
          name: 'v',
          address: '',
          district: 'd',
          latitude: CENTER.latitude + i * 0.001,
          longitude: CENTER.longitude,
        },
      }),
    );
    const pins = visibleMapPins(
      events,
      camera({ zoom: 14, bounds: boundsFromDeltas(CENTER, 0.2, 0.2) }),
    );
    assert.equal(pins.length, MAP_PIN_CAP);
    assert.equal(pins.every((pin) => pin.kind === 'event'), true);
    assert.equal(pins[0]?.id, 'e0');
  });

  test('keeps the selected event even when it is not in the nearest cap', () => {
    const events = Array.from({ length: MAP_PIN_CAP + 1 }, (_, i) =>
      event({
        id: `e${i}`,
        venue: {
          name: 'v',
          address: '',
          district: 'd',
          latitude: CENTER.latitude + i * 0.001,
          longitude: CENTER.longitude,
        },
      }),
    );
    const farId = `e${MAP_PIN_CAP}`;
    const pins = visibleMapPins(
      events,
      camera({ zoom: 14, bounds: boundsFromDeltas(CENTER, 0.2, 0.2) }),
      { selectedId: farId },
    );
    assert.equal(pins.some((pin) => pin.id === farId), true);
    assert.equal(pins.length, MAP_PIN_CAP);
  });
});
