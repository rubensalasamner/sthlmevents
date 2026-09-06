import type { StockholmEvent } from '@/types/event';

/** Case-insensitive match across the fields a user is likely to search by. */
export function searchEvents(
  events: readonly StockholmEvent[],
  query: string,
): StockholmEvent[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [...events];

  return events.filter((event) => {
    const haystack = [
      event.title,
      event.organizer,
      event.venue.name,
      event.venue.district,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(trimmed);
  });
}
