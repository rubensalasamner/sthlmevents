import type { EventCategory } from '@/types/event';

/**
 * Per-category badge palette from the design round: category chips carry their
 * own hue so the feed scans by type at a glance. Colors sit on the card image,
 * so every text on them is dark ink for contrast.
 */
export const CATEGORY_BADGE_COLORS: Record<EventCategory, string> = {
  music: '#7CD4FF',
  art: '#C9B8FF',
  food: '#FFC46B',
  sports: '#8CE99A',
  theatre: '#FFA8C5',
  nightlife: '#B197FC',
  family: '#74E0E1',
  shopping: '#F1A7C6',
  market: '#FFD886',
  popup: '#FF9F7C',
  comedy: '#F4B4FF',
  other: '#A9B4C4',
};

/** Ink color for text on top of any badge in CATEGORY_BADGE_COLORS. */
export const BADGE_INK = '#06121C';
