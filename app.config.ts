/**
 * Expo config wrapper: app.json stays the source of truth; this injects the
 * Google Maps Android API key from the environment at build time so the key
 * never lives in version control, and wires HTTPS deep-link hosts from
 * EXPO_PUBLIC_WEB_ORIGIN so shared links can open the native app when installed.
 *
 * `APP_VARIANT=development` (EAS development profile) uses a separate Android
 * package / iOS bundle id so a local hot-reload client can sit next to the
 * Play Internal Testing build without replacing it.
 *
 * `extends` does not deep-merge app.json (prebuild falls back to a placeholder
 * package id), so app.json is read and merged explicitly here.
 *
 * Values needed before the next native build:
 *   - GOOGLE_MAPS_API_KEY   (Google Cloud — add SHA-1 for both
 *     app.sthlmevents and app.sthlmevents.dev)
 *   - EXPO_PUBLIC_SNAPSHOT_URL (already set in EAS env for the development profile)
 *   - EXPO_PUBLIC_WEB_ORIGIN (https origin of the Vercel web app, for share + App Links)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appJson = JSON.parse(readFileSync(resolve(__dirname, 'app.json'), 'utf8')).expo;

const IS_DEV = process.env.APP_VARIANT === 'development';
const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
const webOrigin = (process.env.EXPO_PUBLIC_WEB_ORIGIN ?? '').trim().replace(/\/$/, '');

const appName = IS_DEV ? 'sthlmevents Dev' : appJson.name;
const androidPackage = IS_DEV ? 'app.sthlmevents.dev' : appJson.android.package;
const iosBundle = IS_DEV ? 'app.sthlmevents.dev' : appJson.ios.bundleIdentifier;
const scheme = IS_DEV ? 'sthlmevents-dev' : appJson.scheme;

const icon = IS_DEV ? './assets/images/icon-dev.png' : appJson.icon;
const splashImage = IS_DEV
  ? './assets/images/splash-icon-dev.png'
  : './assets/images/splash-icon.png';
const androidForeground = IS_DEV
  ? './assets/images/android-icon-foreground-dev.png'
  : appJson.android?.adaptiveIcon?.foregroundImage;

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

const plugins = (appJson.plugins ?? []).map((plugin: unknown) => {
  if (!Array.isArray(plugin) || plugin[0] !== 'expo-splash-screen') return plugin;
  const [, options = {}] = plugin as [string, Record<string, unknown>];
  return [
    'expo-splash-screen',
    {
      ...options,
      image: splashImage,
    },
  ];
});

export default {
  ...appJson,
  name: appName,
  scheme,
  icon,
  plugins,
  ios: {
    ...appJson.ios,
    // Prefer PNG icon for the Dev variant (expo.icon still ships the store mark).
    ...(IS_DEV ? { icon } : null),
    bundleIdentifier: iosBundle,
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
    package: androidPackage,
    adaptiveIcon: {
      ...appJson.android?.adaptiveIcon,
      foregroundImage: androidForeground,
    },
    config: {
      ...appJson.android?.config,
      googleMaps: {
        apiKey: mapsApiKey,
      },
    },
    // App Links stay on the store build only — keep Play as the https:// handler.
    ...(!IS_DEV && webHost
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
    appVariant: IS_DEV ? 'development' : 'production',
  },
};
