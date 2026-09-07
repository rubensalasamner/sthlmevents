import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { stockholmLocalDate, stockholmLocalToUtcIso } from '../../shared/time.js';
import { mapKulturbiljetterCategory } from './category-map.js';
import type { KbDate, KbEventDetail, KbLocation } from './types.js';

export const KULTURBILJETTER_SOURCE = 'kulturbiljetter';
const SITE_BASE = 'https://kulturbiljetter.se';
const DEFAULT_QUALITY_SCORE = 55;

/** Stockholm is KB's only Swedish market with meaningful volume; other cities exist but are noise here. */
const TARGET_CITIES = new Set(['stockholm']);

/** Venues outside the target city, kept as a diagnostic set for tests/logs. */
const NON_TARGET_CITIES = new Set(['solna', 'sundbyberg']);

/** A showing (KB "date") we can place in Stockholm with a resolvable start. */
type MappableShowing = {
  showing: KbDate;
  location: KbLocation | undefined;
  startsAt: string;
  allDay: boolean;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function descriptionText(raw: KbEventDetail): string {
  const source = raw.presentation_long ?? raw.presentation_short ?? '';
  return stripHtml(source).slice(0, 2000);
}

/** First image URL from the numeric-keyed images object. */
export function pickImage(images: KbEventDetail['images']): string | undefined {
  if (!images) return undefined;
  const urls = Object.values(images).filter((url): url is string => Boolean(url));
  return urls[0];
}

function toIso(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

/** Resolves which venue each showing plays at via `location_id`. */
function locationFor(showing: KbDate, locations: Record<string, KbLocation> | null | undefined): KbLocation | undefined {
  if (showing.location_id === undefined || !locations) return undefined;
  return Object.values(locations).find((location) => location.location_id === showing.location_id);
}

/**
 * KB keeps past occurrences of recurring series in `dates` indefinitely, so
 * showings are gated to today onwards (Stockholm-local day — same semantics
 * as the Kulturhuset adapter's `now/d`). `todayLocal` is injectable for tests.
 */
export function isMappableShowing(
  showing: KbDate,
  location: KbLocation | undefined,
  todayLocal: string = stockholmLocalDate(new Date().toISOString()),
): boolean {
  if (!Number.isFinite(showing.unixtime_start)) return false;
  if (stockholmLocalDate(toIso(showing.unixtime_start)) < todayLocal) return false;
  const city = location?.city?.trim().toLowerCase();
  if (!city) return true;
  return TARGET_CITIES.has(city) || NON_TARGET_CITIES.has(city);
}

function mappableShowings(raw: KbEventDetail, todayLocal?: string): MappableShowing[] {
  const showings = Object.values(raw.dates ?? {});
  const result: MappableShowing[] = [];

  for (const showing of showings) {
    const location = locationFor(showing, raw.locations);
    if (!isMappableShowing(showing, location, todayLocal)) continue;
    result.push({
      showing,
      location,
      // date_only showings are documented as "present without a clock time" —
      // normalize them to Stockholm-local midnight so the UI agrees.
      startsAt: showing.date_only
        ? stockholmLocalToUtcIso(stockholmLocalDate(toIso(showing.unixtime_start)))
        : toIso(showing.unixtime_start),
      allDay: showing.date_only === true,
    });
  }

  return result.sort((a, b) => a.showing.unixtime_start - b.showing.unixtime_start);
}

/**
 * Pure transform: one Kulturbiljetter event detail -> 0..n shared
 * `StockholmEvent`s (one per qualifying showing of the run). Prices are the
 * run's min/max; coordinates come from the geocoding stage later.
 * `todayLocal` (YYYY-MM-DD, Stockholm) is injectable for tests; production
 * defaults to the current Stockholm-local day.
 */
export function mapKulturbiljetterEvent(raw: KbEventDetail, todayLocal?: string): StockholmEvent[] {
  const showings = mappableShowings(raw, todayLocal);
  if (showings.length === 0) return [];

  const category = mapKulturbiljetterCategory(raw.title);
  const image = pickImage(raw.images);
  const organizer = raw.organizer?.name?.trim() || 'Kulturbiljetter';
  const eventPage = raw.url_event_page?.trim() || undefined;
  const description = descriptionText(raw);
  const priceMin = raw.price_min !== null && raw.price_min !== undefined ? Number(raw.price_min) : undefined;
  const priceSek = priceMin !== undefined && Number.isFinite(priceMin) && priceMin > 0 ? priceMin : undefined;

  return showings.map(({ showing, location, startsAt, allDay }) => {
    const venueName = location?.name?.trim() || 'Stockholm';
    return {
      // A showing id is globally unique within the source: date_id is scoped
      // per event, so bake the event id in to keep keys collision-free.
      id: `${KULTURBILJETTER_SOURCE}:${rawTitleSlug(raw.title)}-${showing.date_id}`,
      title: raw.title,
      description,
      category,
      imageUrl: image ?? fallbackImageFor(category),
      startsAt,
      venue: {
        name: venueName,
        address: location?.street?.trim() ?? '',
        district: location?.vicinity?.trim() || location?.city?.trim() || 'Stockholm',
      },
      priceSek,
      ticketUrl: showing.url_checkout?.trim() || raw.url_checkout?.trim() || eventPage,
      organizer,
      source: KULTURBILJETTER_SOURCE,
      sourceId: String(showing.date_id),
      sourceUrl: eventPage ?? SITE_BASE,
      updatedAt: new Date().toISOString(),
      isFeatured: false,
      qualityScore: DEFAULT_QUALITY_SCORE,
    };
  });
}

function rawTitleSlug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
