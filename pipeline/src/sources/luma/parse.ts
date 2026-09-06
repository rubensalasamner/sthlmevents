import type { LumaEntry, LumaNextData } from './types.js';

/**
 * Pure parser over the Luma city-page HTML. Reads the server-rendered
 * `__NEXT_DATA__` blob — Luma's own hydration contract — and returns the
 * embedded event entries. Deeper results are behind a client-side paginated
 * API and are intentionally out of scope here.
 */
const NEXT_DATA =
  /<script id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/;

export function parseLumaEvents(html: string): LumaEntry[] {
  const match = html.match(NEXT_DATA);
  if (!match) return [];

  let data: LumaNextData;
  try {
    data = JSON.parse(match[1]!) as LumaNextData;
  } catch {
    return [];
  }

  const events = data.props?.pageProps?.initialData?.data?.events;
  return Array.isArray(events) ? events : [];
}
