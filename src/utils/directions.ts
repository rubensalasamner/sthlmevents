import type { StockholmEvent } from '@/types/event';
import { eventPoint } from '@/utils/geo';
import { venueLine } from '@/utils/format';

export type DirectionsOs = 'ios' | 'android' | 'web';

/** Maps query: coordinates when we have them, otherwise venue text. */
export function directionsQuery(event: StockholmEvent): string | null {
  const point = eventPoint(event);
  if (point) return `${point.latitude},${point.longitude}`;
  const text = venueLine([event.venue.name, event.venue.address, event.venue.district]);
  return text.length > 0 ? text : null;
}

export function directionsUrl(event: StockholmEvent, os: DirectionsOs): string | null {
  const query = directionsQuery(event);
  if (!query) return null;
  const encoded = encodeURIComponent(query);
  if (os === 'ios') return `http://maps.apple.com/?daddr=${encoded}`;
  if (os === 'web') return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  return `geo:0,0?q=${encoded}`;
}
