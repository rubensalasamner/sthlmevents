/**
 * Expo config wrapper: app.json stays the source of truth; this injects the
 * Google Maps Android API key from the environment at build time so the key
 * never lives in version control, and wires HTTPS deep-link hosts from
 * EXPO_PUBLIC_WEB_ORIGIN so shared links can open the native app when installed.
 *
 * `extends` does not deep-merge app.json (prebuild falls back to a placeholder
 * package id), so app.json is read and merged explicitly here.
 *
 * Values needed before the next native build:
 *   - GOOGLE_MAPS_API_KEY   (Google Cloud, restricted to app.sthlmevents + SHA-1)
 *   - EXPO_PUBLIC_SNAPSHOT_URL (already set in EAS env for the development profile)
 *   - EXPO_PUBLIC_WEB_ORIGIN (https origin of the Vercel web app, for share + App Links)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appJson = JSON.parse(readFileSync(resolve(__dirname, 'app.json'), 'utf8')).expo;

const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
const webOrigin = (process.env.EXPO_PUBLIC_WEB_ORIGIN ?? '').trim().replace(/\/$/, '');

let webHost: string | null = null;
if (webOrigin) {
  try {
    const url = new URL(webOrigin);
    if (url.protocol === 'https:') webHost = url.host;
  } catch {
    console.warn(`[app.config] EXPO_PUBLIC_WEB_ORIGIN is not a valid URL: ${webOrigin}`);
  }
}

if (!mapsApiKey) {
  console.warn(
    '[app.config] GOOGLE_MAPS_API_KEY is not set — the Map tab will show ' +
      '"Map not configured" instead of crashing.',
  );
}

export default {
  ...appJson,
  ios: {
    ...appJson.ios,
    ...(webHost
      ? {
          associatedDomains: [
            ...new Set([...(appJson.ios?.associatedDomains ?? []), `applinks:${webHost}`]),
          ],
        }
      : null),
  },
  android: {
    ...appJson.android,
    config: {
      ...appJson.android?.config,
      googleMaps: {
        apiKey: mapsApiKey,
      },
    },
    ...(webHost
      ? {
          intentFilters: [
            ...(appJson.android?.intentFilters ?? []),
            {
              action: 'VIEW',
              autoVerify: true,
              data: [
                {
                  scheme: 'https',
                  host: webHost,
                  pathPrefix: '/event',
                },
              ],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ],
        }
      : null),
  },
  extra: {
    ...appJson.extra,
    // Expo strips android.config.googleMaps.apiKey from the embedded JS
    // config in built apps, so the map gate reads this flag instead.
    mapsConfigured: Boolean(mapsApiKey),
    webOrigin: webHost ? `https://${webHost}` : null,
  },
};
