/**
 * Detect CDN URLs that expire (Facebook / Instagram signed assets). Hosting
 * these on R2 is UX — dead fbcdn frames kill the feed faster than missing features.
 */
export function isFragileImageUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }

  return (
    host.includes('fbcdn.net') ||
    host.includes('cdninstagram.com') ||
    host.endsWith('.facebook.com') ||
    host === 'facebook.com' ||
    host.endsWith('.fbsbx.com') ||
    host === 'fbsbx.com' ||
    host === 'instagram.com' ||
    host.endsWith('.instagram.com')
  );
}

/**
 * Hosts verified to send Access-Control-Allow-Origin on image GETs.
 * expo-image's `useImage` fetches via CORS on web — anything outside this set
 * (and not already on our R2) should be re-hosted so cards don't fall back to
 * the category placeholder.
 */
const CORS_SAFE_IMAGE_HOSTS = new Set([
  'images.unsplash.com',
  's1.ticketm.net',
  'static.tickster.com',
  'secure.meetupstatic.com',
  'images.lumacdn.com',
  'cdn-az.allevents.in',
  'a.storyblok.com',
  'cdn.prod.website-files.com',
  'cdn.tixly.com',
  'i0.wp.com',
  'biljett.scalateatern.se',
  'branding.nortic.io',
  'assets.fiba.basketball',
  'dreamhack.com',
  'easyfairsassets.com',
  'edu-stockholm.proofx.se',
  'fantastika2026.com',
  'fkpscorpio.se',
  'freight.cargo.site',
  'horizons-cdn.hostinger.com',
  'hotwheelsstuntshow.com',
]);

export function isCorsSafeImageHost(url: string): boolean {
  try {
    return CORS_SAFE_IMAGE_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Whether the snapshot pipeline should download + upload this image to R2.
 * Fragile CDNs (expiry) always qualify; other hosts qualify unless they already
 * live on our public R2 base or are known CORS-safe for the web client.
 */
export function shouldHostImageUrl(url: string, publicBaseUrl?: string): boolean {
  if (!url) return false;

  if (publicBaseUrl) {
    const base = publicBaseUrl.replace(/\/$/, '');
    if (url === base || url.startsWith(`${base}/`)) return false;
  }

  if (isFragileImageUrl(url)) return true;
  if (isCorsSafeImageHost(url)) return false;

  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** File extension hint from a Content-Type or URL path. */
export function imageExtension(contentType: string | null, sourceUrl: string): string {
  const type = (contentType ?? '').split(';')[0]!.trim().toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';

  try {
    const path = new URL(sourceUrl).pathname.toLowerCase();
    const match = path.match(/\.(jpe?g|png|webp|gif)$/);
    if (match) return match[1] === 'jpeg' ? 'jpg' : match[1]!;
  } catch {
    // fall through
  }
  return 'jpg';
}
