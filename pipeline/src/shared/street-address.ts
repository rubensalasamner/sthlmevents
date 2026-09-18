/**
 * Pull a Stockholm-style street + number out of free text (IG captions,
 * messy venue fields). Prefer this over brand names, postal codes, or hashtags
 * when geocoding — Nominatim hits "Tjurbergsgatan 29" and misses
 * "Dedicated HQ, Tjurbergsgatan 29 Södermalm.".
 */

/**
 * Optional single leading word + street-type token + number.
 * Leading word is kept only when the street token is bare `torg`/`strand`
 * (e.g. Mosebacke torg); brand prefixes like "Loppis Hägerstensvägen" drop.
 * Bare `torg` is a separate alt so `[A-Za-z]+torg` cannot consume it alone.
 */
const STREET_ADDRESS_RE =
  /\b((?:([A-ZÅÄÖa-zåäö]+)\s+)?([A-ZÅÄÖa-zåäö]+(?:gatan|vägen|allén|strand|torg)|torg|strand))\s+(\d+[A-Za-z]?)\b/gi;

const BARE_STREET_TYPE = /^(?:strand|torg)$/i;
/** Keep these as part of the street name (St Eriksgatan, Söder Mälarstrand). */
const KEEP_LEADING = /^(?:st|s:t|sankt|söder|södra|norra|östra|västra|gamla|stora|lilla)$/i;

/** "118 25 Stockholm" / "11825 Stockholm" — too coarse for a pin. */
const POSTAL_ONLY_RE = /^\d{3}\s?\d{2}\s*,?\s*stockholm\b/i;

export function isPostalCodeVenue(text: string): boolean {
  return POSTAL_ONLY_RE.test(text.trim());
}

export function isHashtagVenue(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return /^(?:#\S+\s*)+$/.test(trimmed);
}

/**
 * Best street+number in `text`, or undefined.
 */
export function extractStreetAddress(text: string): string | undefined {
  STREET_ADDRESS_RE.lastIndex = 0;
  const match = STREET_ADDRESS_RE.exec(text);
  if (!match) return undefined;
  const leading = match[2];
  const streetWord = match[3];
  const number = match[4];
  if (!streetWord || !number) return undefined;
  if (leading && (BARE_STREET_TYPE.test(streetWord) || KEEP_LEADING.test(leading))) {
    return `${leading} ${streetWord} ${number}`;
  }
  return `${streetWord} ${number}`;
}
