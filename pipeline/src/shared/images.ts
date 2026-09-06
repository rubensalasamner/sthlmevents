import type { EventCategory } from './event.js';

/**
 * Sources without images (e.g. Visit Stockholm's API) get a category-based
 * placeholder so the image-led UI still renders. A later enrichment stage can
 * replace these with the real `og:image` scraped from the event page.
 */
const FALLBACK_IMAGES: Record<EventCategory, string> = {
  music: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200',
  art: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1200',
  food: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200',
  sports: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200',
  theatre: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200',
  nightlife: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
  family: 'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=1200',
  shopping: 'https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=1200',
  market: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200',
  popup: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200',
  comedy: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200',
  other: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200',
};

export function fallbackImageFor(category: EventCategory): string {
  return FALLBACK_IMAGES[category];
}
