/**
 * Expo config wrapper: app.json stays the source of truth; this injects the
 * Google Maps Android API key from the environment at build time so the key
 * never lives in version control.
 *
 * Values needed before the next native build:
 *   - GOOGLE_MAPS_API_KEY   (Google Cloud, restricted to app.sthlmevents + SHA-1)
 *   - EXPO_PUBLIC_SNAPSHOT_URL (already set in EAS env for the development profile)
 */
const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

if (!mapsApiKey) {
  console.warn(
    '[app.config] GOOGLE_MAPS_API_KEY is not set — the Map tab will show ' +
      '"Map not configured" instead of crashing.',
  );
}

export default {
  extends: './app.json',
  extra: {
    eas: {
      projectId: '88d5f77c-9fa3-45ac-a6fe-0f62627662c0',
    },
  },
  android: {
    config: {
      googleMaps: {
        apiKey: mapsApiKey,
      },
    },
  },
};
