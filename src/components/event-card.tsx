import { EventPresentation } from '@/components/event-presentation';
import type { StockholmEvent } from '@/types/event';

/** @deprecated Use EventPresentation with an explicit variant. */
export function EventCard({ event, width }: { event: StockholmEvent; width?: number }) {
  return (
    <EventPresentation event={event} variant={width ? 'poster' : 'compact'} width={width} />
  );
}
