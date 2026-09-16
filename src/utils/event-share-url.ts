import type { StockholmEvent } from '@/types/event';

/**
 * Public web origin for shareable event links (no trailing slash).
 * Prefer an explicit env; fall back to the snapshot host when it lives on the
 * same deployment (typical Vercel setup); on web use the current origin.
 */
export function webAppOrigin(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_ORIGIN?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  const snapshot = process.env.EXPO_PUBLIC_SNAPSHOT_URL?.trim();
  if (snapshot) {
    try {
      const url = new URL(snapshot);
      if (url.pathname.endsWith('events.snapshot.json') || url.pathname.endsWith('/events.snapshot.json')) {
        return url.origin;
      }
    } catch {
      // ignore malformed env
    }
  }

  return null;
}

/** HTTPS (or custom-scheme) URL that opens this event in the app / web client. */
export function eventShareUrl(event: Pick<StockholmEvent, 'id'>, origin = webAppOrigin()): string {
  const path = `/event/${encodeURIComponent(event.id)}`;
  if (origin) return `${origin.replace(/\/$/, '')}${path}`;
  // Installed app without a configured web host — still deep-linkable.
  return `sthlmevents:/${path}`;
}
