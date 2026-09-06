import type { EventCategory } from '../../shared/event.js';
import type { TmClassification } from './types.js';

/**
 * Maps Ticketmaster's classification taxonomy to our internal categories.
 * Segment is the coarse signal; a few genres are more specific than their
 * segment (e.g. Comedy sits under "Arts & Theatre") and override it.
 */
const SEGMENT_TO_CATEGORY: Record<string, EventCategory> = {
  Music: 'music',
  Sports: 'sports',
  'Arts & Theatre': 'theatre',
  Film: 'other',
  Miscellaneous: 'other',
};

const GENRE_TO_CATEGORY: Record<string, EventCategory> = {
  Comedy: 'comedy',
  Family: 'family',
  Dance: 'theatre',
};

/** Prefers the classification flagged `primary`, else the first one. */
export function primaryClassification(
  classifications: readonly TmClassification[] | undefined,
): TmClassification | undefined {
  if (!classifications?.length) return undefined;
  return classifications.find((classification) => classification.primary) ?? classifications[0];
}

export function mapTicketmasterCategory(classification: TmClassification | undefined): EventCategory {
  const genre = classification?.genre?.name;
  if (genre && GENRE_TO_CATEGORY[genre]) return GENRE_TO_CATEGORY[genre];

  const segment = classification?.segment?.name;
  return (segment && SEGMENT_TO_CATEGORY[segment]) || 'other';
}
