import type { EventCategory } from '../../shared/event.js';

/**
 * Maps Visit Stockholm's top-level category slugs to our internal taxonomy.
 * Kept as a standalone table (strategy) so each source owns its own mapping
 * and adding/adjusting a source never affects the others.
 *
 * Verified slugs (2026): sports, stage-film, science-tech, careers-leadership,
 * clubs-parties, eat-drink, fairs, exhibitions, family, festivals,
 * guided-tours, networking-community, music, christmas-new-years-eve,
 * gaming-boardgames.
 */
const SLUG_TO_CATEGORY: Record<string, EventCategory> = {
  music: 'music',
  'clubs-parties': 'nightlife',
  exhibitions: 'art',
  'stage-film': 'theatre',
  'eat-drink': 'food',
  sports: 'sports',
  family: 'family',
  fairs: 'market',
  festivals: 'music',
  'gaming-boardgames': 'other',
  'guided-tours': 'other',
  'networking-community': 'other',
  'science-tech': 'other',
  'careers-leadership': 'other',
  'christmas-new-years-eve': 'other',
};

/**
 * Priority order for resolving a single category when an event carries several
 * source slugs. More specific/primary categories win, independent of the order
 * the API happens to list them in.
 */
const SLUG_PRIORITY: readonly string[] = [
  'music',
  'clubs-parties',
  'stage-film',
  'exhibitions',
  'sports',
  'family',
  'fairs',
  'eat-drink',
  'festivals',
];

/**
 * Resolves a single internal category from a list of source category slugs.
 * Applies a fixed priority so results don't depend on API array order; falls
 * back to `other`.
 */
export function mapVisitStockholmCategory(slugs: readonly string[]): EventCategory {
  const present = new Set(slugs);
  for (const slug of SLUG_PRIORITY) {
    if (present.has(slug)) return SLUG_TO_CATEGORY[slug]!;
  }
  for (const slug of slugs) {
    const mapped = SLUG_TO_CATEGORY[slug];
    if (mapped) return mapped;
  }
  return 'other';
}

export { SLUG_TO_CATEGORY };
