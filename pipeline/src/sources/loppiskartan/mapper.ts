import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { stockholmLocalToUtcIso } from '../../shared/time.js';
import type { LoppisRow } from './types.js';

export const LOPPISKARTAN_SOURCE = 'loppiskartan';
const SITE_BASE = 'https://loppiskartan.se';
const DEFAULT_QUALITY_SCORE = 40;

function slugOf(path: string): string {
  return path.replace(/^\/markets\//, '').replace(/\/$/, '');
}

/**
 * Pure transform: one loppiskartan row -> shared `StockholmEvent`.
 * Flea markets are `market`, free entry, and carry no coordinates (hidden from
 * the map). The detail page is used both as the user link and as the og:image
 * source for the enrichment stage. One market page can list many dates
 * (recurring markets), so the id/sourceId is scoped per occurrence date.
 */
export function mapLoppisRow(row: LoppisRow): StockholmEvent {
  const url = `${SITE_BASE}${row.path}`;
  const slug = slugOf(row.path);
  const startsAt = stockholmLocalToUtcIso(row.date, row.startTime);
  const endsAt = row.endTime ? stockholmLocalToUtcIso(row.date, row.endTime) : undefined;

  return {
    id: `${LOPPISKARTAN_SOURCE}:${slug}@${row.date}`,
    title: row.title,
    description: `Loppis i ${row.city} (${row.region}).`,
    category: 'market',
    imageUrl: fallbackImageFor('market'),
    startsAt,
    endsAt,
    venue: {
      name: row.city || 'Stockholm',
      address: '',
      district: row.city || row.region.replace(/\s*län$/i, ''),
    },
    priceSek: 0,
    ticketUrl: url,
    organizer: row.city || 'Loppiskartan',
    source: LOPPISKARTAN_SOURCE,
    sourceId: `${slug}@${row.date}`,
    sourceUrl: url,
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
