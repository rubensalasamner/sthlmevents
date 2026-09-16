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
    host === 'instagram.com' ||
    host.endsWith('.instagram.com')
  );
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
