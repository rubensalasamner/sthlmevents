/**
 * Extracts a representative image (Open Graph / Twitter card) from an event's
 * external website. Sources like Visit Stockholm ship no images, so we scrape
 * the organizer page's social-share image to give the feed real artwork.
 */

const META_TAG = /<meta\b[^>]*>/gi;
const ATTR = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

/** Meta keys to try, in priority order. */
const IMAGE_KEYS = [
  'og:image:secure_url',
  'og:image:url',
  'og:image',
  'twitter:image',
  'twitter:image:src',
];

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTR.lastIndex = 0;
  while ((match = ATTR.exec(tag)) !== null) {
    const key = match[1]!.toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    attrs[key] = value;
  }
  return attrs;
}

/**
 * Pure parse: given HTML and the page URL, return an absolute image URL or null.
 * Handles attribute order variance, relative URLs, and HTML entities.
 */
export function parseOgImage(html: string, baseUrl: string): string | null {
  const found: Record<string, string> = {};

  const tags = html.match(META_TAG) ?? [];
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const key = (attrs.property ?? attrs.name ?? '').toLowerCase();
    const content = attrs.content;
    if (key && content && IMAGE_KEYS.includes(key) && !found[key]) {
      found[key] = decodeEntities(content.trim());
    }
  }

  for (const key of IMAGE_KEYS) {
    const raw = found[key];
    if (!raw) continue;
    try {
      const absolute = new URL(raw, baseUrl).toString();
      if (absolute.startsWith('http')) return absolute;
    } catch {
      // ignore malformed URL, try next key
    }
  }
  return null;
}

export type ResolveOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  userAgent?: string;
};

const DEFAULT_TIMEOUT_MS = 6000;
const DEFAULT_UA =
  'Mozilla/5.0 (compatible; sthlmevents/0.1; +https://github.com/sthlmevents)';
const MAX_HTML_BYTES = 512 * 1024;

/** Fetches a page and extracts its og:image. Returns null on any failure. */
export async function resolveOgImage(
  url: string,
  options: ResolveOptions = {},
): Promise<string | null> {
  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const response = await doFetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': options.userAgent ?? DEFAULT_UA,
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) return null;

    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    return parseOgImage(html, response.url || url);
  } catch {
    return null;
  }
}
