/**
 * Expo config wrapper: app.json stays the source of truth; this injects the
 * Google Maps Android API key from the environment at build time so the key
 * never lives in version control.
 *
 * `extends` does not deep-merge app.json (prebuild falls back to a placeholder
 * package id), so app.json is read and merged explicitly here.
 *
 * Values needed before the next native build:
 *   - GOOGLE_MAPS_API_KEY   (Google Cloud, restricted to app.sthlmevents + SHA-1)
 *   - EXPO_PUBLIC_SNAPSHOT_URL (already set in EAS env for the development profile)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appJson = JSON.parse(readFileSync(resolve(__dirname, 'app.json'), 'utf8')).expo;

const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

if (!mapsApiKey) {
  console.warn(
    '[app.config] GOOGLE_MAPS_API_KEY is not set — the Map tab will show ' +
      '"Map not configured" instead of crashing.',
  );
}

export default {
  ...appJson,
  android: {
    ...appJson.android,
    config: {
      ...appJson.android?.config,
      googleMaps: {
        apiKey: mapsApiKey,
      },
    },
  },
};
