import type { StockholmEvent } from '../../shared/event.js';
import { fallbackImageFor } from '../../shared/images.js';
import { mapKhsCategory } from './category-map.js';
import type { KhsEventSource } from './types.js';

export const KULTURHUSET_SOURCE = 'kulturhuset';
const DEFAULT_QUALITY_SCORE = 50;
/** tixSaleStatusId 2 = on sale; anything else (paused/ended) is still content. */

/**
 * Pure transform: one raw index document -> shared `StockholmEvent`.
 * `tix*` fields are authoritative for times/prices/ticket link; `drupal*`
 * fields supply display content. Both time fields already carry the explicit
 * +02:00/+01:00 offset, so no wall-clock conversion is needed.
 */
export function mapKhsEvent(raw: KhsEventSource): StockholmEvent {
  const title = (raw.drupalTitle || raw.tixName).trim();
  const lead = (raw.drupalLeadText?.[0]?.value ?? '').replace(/\s+/g, ' ').trim();
  const categoryLabels = (raw.drupalCategory ?? []).map((c) => c.label);
  const venueName =
    raw.tixVenue?.[0]?.label?.trim() || raw.drupalLocation?.[0]?.label?.trim() || 'Kulturhuset Stadsteatern';
  const hall = raw.tixHall?.[0]?.label?.trim();

  const priceKnown = typeof raw.tixMinPrice === 'number' && !raw.hidePriceInfo;

  return {
    id: `kulturhuset:${raw.tixEventId}`,
    title,
    description: lead,
    category: mapKhsCategory(categoryLabels, title, lead),
    imageUrl: raw.drupalHeroImage?.[0]?.src?.trim() || fallbackImageFor('other'),
    startsAt: new Date(raw.tixStartDate).toISOString(),
    endsAt: raw.tixEndDate ? new Date(raw.tixEndDate).toISOString() : undefined,
    venue: {
      name: venueName,
      address: hall ? `${venueName}, ${hall}` : venueName,
      district: 'Stockholm',
    },
    priceSek: priceKnown ? (raw.tixMinPrice as number) : undefined,
    ticketUrl: raw.tixTicketLink?.trim() || undefined,
    organizer: 'Kulturhuset Stadsteatern',
    source: KULTURHUSET_SOURCE,
    sourceId: String(raw.tixEventId),
    sourceUrl: raw.drupalLink?.trim() || undefined,
    updatedAt: new Date().toISOString(),
    isFeatured: false,
    qualityScore: DEFAULT_QUALITY_SCORE,
  };
}
