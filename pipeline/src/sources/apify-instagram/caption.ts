/**
 * Caption parsing for the Instagram source. IG posts carry NO structured
 * event data (verified 2026-09-16: 0/31 posts had location; dates only exist
 * as free text) — everything must be extracted from the caption.
 *
 * All functions are pure and total: they return `undefined` / empty parts
 * rather than throwing, and the adapter drops posts without a parseable date.
 */

/** Weekday names -> ISO day number (Monday=1 .. Sunday=7). */
const WEEKDAYS: Record<string, number> = {
  måndag: 1, tisdag: 2, onsdag: 3, torsdag: 4, fredag: 5, lördag: 6, söndag: 7,
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7,
};

const MONTHS: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, mars: 3, apr: 4, april: 4,
  maj: 5, jun: 6, juni: 6, jul: 7, juli: 7, aug: 8, augusti: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

const MONTH_WORD_SRC = 'januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|okt|nov|dec';

/** Stockholm hint words strong enough to keep a post (same list as FB mapper). */
const STOCKHOLM_HINTS_RE =
  /stockholm|södermalm|norrmalm|östermalm|vasastan|kungsholmen|djurgården|solna|sundbyberg|lidingö|nacka|huddinge|täby|bromma|årsta|farsta|skärholmen|spånga|stockholmsmässan|a-house|uggelviksgatan|hornstull|nytorget|stureplan|sofo|gamla stan/i;

/** Ad/giveaway captions are never events. */
const NOISE_RE =
  /giveaway|vinst en|tävling:|rabattkod|restock|länk i bio$|samarbete med|annons:/i;

export type ParsedCaption = {
  /** The single event date found, as `YYYY-MM-DD` (Stockholm-local). */
  date?: { year: number; month: number; day: number };
  /** A second date when the caption announces a range (day 1..day N). */
  endDate?: { year: number; month: number; day: number };
  /** `HH:mm` strings; absent -> the app treats it as an all-day event. */
  startTime?: string;
  endTime?: string;
};

/**
 * Extracts the event window from a caption, relative to `today` (injected for
 * tests). Handles the formats actually observed in the probe:
 *  - "Fri 25/9 10-18.00" / "26/9" / "11/9 - 08.00-18.00"
 *  - "16–17 September" / "23-24 sep" / "25 September"
 *  - "imorgon", "idag"
 * A caption with several disjoint dates (e.g. weekly roundups) yields NO date
 * -> the post is dropped; roundups are not single events.
 */
export function parseCaptionDate(caption: string, today: Date): ParsedCaption {
  const text = caption.replace(/\s+/g, ' ').trim();
  const year = today.getFullYear();

  // "25/9" or "11/9" (day/month, no year); optionally "25/9-26/9" range.
  const slashMatch = text.match(
    /\b(\d{1,2})\/(\d{1,2})(?:\s*[–\-]\s*(\d{1,2})\/(\d{1,2}))?\b/,
  );
  // "16–17 September" / "23-24 sep" / "25 September".
  const monthMatch =
    text.match(
      new RegExp(`\\b(\\d{1,2})\\s*[–\\-]\\s*(\\d{1,2})\\s+(${MONTH_WORD_SRC})\\b`, 'i'),
    ) ?? text.match(new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_WORD_SRC})\\b`, 'i'));
  // Bare numeric range "11-15" only when a month word appears elsewhere —
  // otherwise too ambiguous (scores, prices, street numbers).
  const bareMatch = /\b(jan|feb|mar|apr|maj|jun|jul|aug|sep|sept|okt|nov|dec)/i.test(text)
    ? text.match(/\b(\d{1,2})\s*[–\-]\s*(\d{1,2})\b/)
    : null;

  // Date and time patterns overlap ("11/9 - 08.00" contains the pseudo-span
  // "9 - 08"), so the winning DATE span is masked out of the time search.
  let dateSpan: [number, number] | undefined;

  const result: ParsedCaption = {};
  if (slashMatch?.index !== undefined && slashMatch[1] && slashMatch[2]) {
    const [, d1, m1, d2, m2] = slashMatch;
    result.date = { year, month: Number(m1), day: Number(d1) };
    if (d2 && m2) result.endDate = { year, month: Number(m2), day: Number(d2) };
    // Mask the WHOLE match: "11/9 - 08.00" — the trailing "- 08" belongs to
    // the date separation, not a time span.
    const afterSlash = text.slice(slashMatch.index + slashMatch[0].length);
    const extendsIntoTime = afterSlash.match(/^\s*[–\-]\s*\d/);
    if (extendsIntoTime?.[0]) {
      dateSpan = [slashMatch.index, slashMatch.index + slashMatch[0].length + extendsIntoTime[0].length];
    } else {
      dateSpan = [slashMatch.index, slashMatch.index + slashMatch[0].length];
    }
  } else if (monthMatch?.index !== undefined && monthMatch[1]) {
    if (monthMatch[3] !== undefined) {
      // "16–17 September" range
      const month = MONTHS[monthMatch[3].toLowerCase()] ?? today.getMonth() + 1;
      result.date = { year, month, day: Number(monthMatch[1]) };
      result.endDate = { year, month, day: Number(monthMatch[2]) };
    } else {
      // "25 September" single
      const month = MONTHS[monthMatch[2]!.toLowerCase()] ?? today.getMonth() + 1;
      result.date = { year, month, day: Number(monthMatch[1]) };
    }
    dateSpan = [monthMatch.index, monthMatch.index + monthMatch[0].length];
  } else if (bareMatch?.index !== undefined && bareMatch[1] && bareMatch[2]) {
    const monthWord =
      text.match(new RegExp(`\\b(${MONTH_WORD_SRC})\\w*`, 'i'))?.[0] ?? '';
    const month = MONTHS[monthWord.toLowerCase()] ?? today.getMonth() + 1;
    result.date = { year, month, day: Number(bareMatch[1]) };
    result.endDate = { year, month, day: Number(bareMatch[2]) };
    dateSpan = [bareMatch.index, bareMatch.index + bareMatch[0].length];
  } else if (/\bimorgon\b/i.test(text)) {
    const d = new Date(today.getTime() + 86_400_000);
    result.date = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    dateSpan = undefined;
  } else if (/\bidag\b/i.test(text)) {
    result.date = { year, month: today.getMonth() + 1, day: today.getDate() };
    dateSpan = undefined;
  } else {
    // Weekday mentions ("lördag 4 okt" is caught by monthMatch; bare "på
    // lördag" resolves to the NEXT such weekday) — only when exactly one
    // weekday name appears.
    const weekdayMatches = Object.keys(WEEKDAYS).filter((w) =>
      new RegExp(`\\b${w}\\b`, 'i').test(text),
    );
    if (weekdayMatches.length === 1) {
      const target = WEEKDAYS[weekdayMatches[0]!] ?? 1;
      const d = new Date(today.getTime());
      const delta = ((target - (d.getDay() === 0 ? 7 : d.getDay()) + 7) % 7) || 7;
      d.setDate(d.getDate() + delta);
      result.date = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    }
  }
  if (!result.date) return {};

  return { ...result, ...times(text, dateSpan) };
}

/**
 * First "10-18", "10.00-18.00", "10:00–16:00" style time span in the text,
 * SKIPPING the date span (its "9 - 08" fragment is not a time). The date span
 * is physically REMOVED before matching — continuing a global exec past a
 * skipped match loses the "08.00-18.00" that overlaps it. Hours may appear
 * with or without minutes; "10-18.00" and "10:00-16:00" both work.
 */
function times(
  text: string,
  skip: [number, number] | undefined,
): { startTime?: string; endTime?: string } {
  const search =
    skip && text.slice(skip[0], skip[1])
      ? text.slice(0, skip[0]) + ' '.repeat(skip[1] - skip[0]) + text.slice(skip[1])
      : text;
  const m = search.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*[–\-]\s*(\d{1,2})(?:[:.](\d{2}))?\b/);
  if (!m) return {};
  const pad = (h: string, min?: string) => `${h.padStart(2, '0')}:${min ?? '00'}`;
  return { startTime: pad(m[1]!, m[2]), endTime: pad(m[3]!, m[4]) };
}

/**
 * A post is event-like Stockholm long-tail when: Stockholm shows up in
 * caption/location, it is not obvious ad-noise, and a date could be parsed.
 */
export function looksLikeStockholmPost(
  post: { caption?: string | null; location?: { name?: string } | null },
  parsed: ParsedCaption,
): boolean {
  if (!parsed.date) return false;
  if (NOISE_RE.test(post.caption ?? '')) return false;
  return STOCKHOLM_HINTS_RE.test(`${post.caption ?? ''} ${post.location?.name ?? ''}`);
}

import { extractStreetAddress, isHashtagVenue, isPostalCodeVenue } from '../../shared/street-address.js';

/**
 * Venue extraction: IG gives no structured location, so prefer an explicit
 * street+number anywhere in the caption (geocodes reliably). Fall back to the
 * first place-keyword line, skipping hashtag soup and postal-code-only lines.
 */
export function extractVenue(caption: string): string | undefined {
  const street = extractStreetAddress(caption);
  if (street) return street;

  const lines = caption
    .split(/\n|•|👉|\u{1F4CD}/u) // newline, bullet, pointing finger, pin emoji
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 4 && line.length <= 120)
    .filter((line) => !isHashtagVenue(line) && !isPostalCodeVenue(line));
  const venueLine = lines.find((line) =>
    /gatan|vägen|väg \d|torg|plan\b|galleria|hallen|huset|studio|gallery|butik|konsthall|slott|park\b|center|centrum|market|saluhall|house\b|allén|strand/i.test(
      line,
    ),
  );
  if (venueLine) {
    return venueLine
      .replace(/^(var|where)\??\s*[:：]?\s*/i, '')
      .replace(/^\S+\s+(?=[A-ZÅÄÖ]*Stockholm\b)/, '') // strip a brand prefix before the city word
      .trim();
  }
  const hintLine = lines.find((line) => STOCKHOLM_HINTS_RE.test(line));
  return hintLine?.trim();
}
