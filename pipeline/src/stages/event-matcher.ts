import type { StockholmEvent } from '../shared/event.js';
import { haversineKm, jaroWinkler, levenshteinRatio, normalizeTitle } from './similarity.js';

/**
 * Strategy config for deciding whether two same-day events are the same event.
 * Tunable so the matcher can be made stricter/looser without touching callers.
 */
export type MatchConfig = {
  /** Title similarity at/above which titles alone confirm a match. */
  titleMergeThreshold: number;
  /** Title similarity below which events are never merged. */
  titleFloor: number;
  /** Shortest title length eligible for a substring-containment match. */
  containmentMinLength: number;
  /** Jaro-Winkler venue-name similarity that corroborates a borderline title. */
  venueThreshold: number;
  /** Max venue distance (km) that corroborates a borderline title. */
  geoKm: number;
};

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  titleMergeThreshold: 0.9,
  titleFloor: 0.55,
  containmentMinLength: 8,
  venueThreshold: 0.92,
  geoKm: 0.15,
};

/** Shortest substring still distinctive enough to corroborate a borderline match. */
const CONTAINMENT_SOFT_MIN_LENGTH = 4;

/**
 * Venue values that identify no particular place. A generic (or too-short to
 * be meaningful) name can neither corroborate nor contradict a match — it is
 * evidence of nothing.
 */
const GENERIC_VENUES = new Set(['stockholm', 'stockholms stadsbibliotek', 'unknown']);

function venueIsSpecific(event: StockholmEvent): boolean {
  const name = normalizeTitle(event.venue.name);
  return name.length >= 4 && !GENERIC_VENUES.has(name);
}

/**
 * Title similarity in [0, 1]. Exact-normalized titles score 1. When a longer
 * title fully contains a shorter one (handles "X" vs "X — Live at Y"):
 *  - a distinctive substring (>= `containmentMinLength`) scores 0.95, enough to
 *    merge on its own;
 *  - a short substring (4..containmentMinLength) scores 0.75 — borderline, so a
 *    merge also needs venue/geo corroboration (prevents "Techno" swallowing
 *    "Techno Night" and "Techno Rave" into one).
 * Otherwise a Levenshtein ratio.
 */
export function titleSimilarity(a: string, b: string, config: MatchConfig = DEFAULT_MATCH_CONFIG): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;

  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (shorter.length > 0 && longer.includes(shorter)) {
    if (shorter.length >= config.containmentMinLength) return 0.95;
    if (shorter.length >= CONTAINMENT_SOFT_MIN_LENGTH) return 0.75;
  }
  return levenshteinRatio(na, nb);
}

function venuesMatch(a: StockholmEvent, b: StockholmEvent, config: MatchConfig): boolean {
  const va = normalizeTitle(a.venue.name);
  const vb = normalizeTitle(b.venue.name);
  if (!va || !vb) return false;
  return jaroWinkler(va, vb) >= config.venueThreshold;
}

function venuesColocated(a: StockholmEvent, b: StockholmEvent, config: MatchConfig): boolean {
  const { latitude: la, longitude: loa } = a.venue;
  const { latitude: lb, longitude: lob } = b.venue;
  if (la === undefined || loa === undefined || lb === undefined || lob === undefined) {
    return false;
  }
  return haversineKm(la, loa, lb, lob) <= config.geoKm;
}

/**
 * Decides whether two events (already known to share a Stockholm-local day)
 * are the same. Near-identical titles merge outright; clearly different titles
 * never do. Identical titles normally merge, but not when two *known, clearly
 * different* venues contradict them — a same-titled program at two library
 * branches is two happenings, not one event listed twice. Borderline titles
 * need venue or geo corroboration; missing venue data neither forces nor
 * blocks a merge.
 */
export function sameEvent(
  a: StockholmEvent,
  b: StockholmEvent,
  config: MatchConfig = DEFAULT_MATCH_CONFIG,
): boolean {
  const title = titleSimilarity(a.title, b.title, config);
  if (title < config.titleFloor) return false;

  const corroborated = venuesMatch(a, b, config) || venuesColocated(a, b, config);
  const specific = venueIsSpecific(a) && venueIsSpecific(b);

  // Exact same title: strong evidence — unless two known venues disagree.
  if (title === 1) return corroborated || !specific;
  // Near-identical (containment / close spellings): venue disagreement is
  // usually naming drift for the same place ("Globen" vs "Avicii Arena").
  if (title >= config.titleMergeThreshold) return true;
  // Borderline titles need venue or geo corroboration (or absent venue data).
  return corroborated || !specific;
}
