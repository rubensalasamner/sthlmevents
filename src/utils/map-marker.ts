import type { StockholmEvent } from '@/types/event';
import { isOngoing } from '@/utils/event-interval';

const STOCKHOLM_TZ = 'Europe/Stockholm';

const bubbleTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: STOCKHOLM_TZ,
});

/** Titles unlock around district zoom (was 14.5 — too late). Tunable. */
export const MAP_TITLE_ZOOM = 13;

/** Sparse filter results get titles even when zoomed out. */
export const MAP_TITLE_MAX_EVENTS = 20;

/** Truncated title length on the primary bubble row. */
export const MAP_TITLE_MAX_CHARS = 18;

/** Discrete size steps so zoom doesn't rebuild icons every frame. */
export type MapBubbleSizeTier = 'sm' | 'md' | 'lg';

/** Pixel scale for PNG bubbles — bumped for readability on dark basemap. */
export const MAP_BUBBLE_SCALE: Record<MapBubbleSizeTier, number> = {
  sm: 1.55,
  md: 1.9,
  lg: 2.25,
};

export type MapBubbleContent = {
  /** Title when unlocked, otherwise time / Nu. */
  primary: string;
  /** Time / Nu on a second row when the title is showing. */
  secondary?: string;
};

/** Events that have coordinates and can be plotted on the map. */
export function mappableEvents(events: readonly StockholmEvent[]): StockholmEvent[] {
  return events.filter(
    (event) => event.venue.latitude !== undefined && event.venue.longitude !== undefined,
  );
}

export function shouldShowMapTitles(eventCount: number, zoom: number): boolean {
  return eventCount <= MAP_TITLE_MAX_EVENTS || zoom >= MAP_TITLE_ZOOM;
}

export function mapBubbleSizeTier(zoom: number): MapBubbleSizeTier {
  if (zoom >= 15.5) return 'lg';
  if (zoom >= MAP_TITLE_ZOOM) return 'md';
  return 'sm';
}

export function truncateMapTitle(title: string, maxChars = MAP_TITLE_MAX_CHARS): string {
  const cleaned = title.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars - 1).trimEnd()}…`;
}

export function formatMapBubbleTime(event: StockholmEvent, now: Date = new Date()): string {
  if (isOngoing(event, now)) return 'Nu';
  return bubbleTimeFormatter.format(new Date(event.startsAt));
}

/**
 * Bubble copy. Title mode keeps the time on `secondary` so it doesn't disappear.
 */
export function mapBubbleContent(
  event: StockholmEvent,
  options: { showTitle?: boolean; now?: Date } = {},
): MapBubbleContent {
  const time = formatMapBubbleTime(event, options.now ?? new Date());
  if (options.showTitle) {
    return { primary: truncateMapTitle(event.title), secondary: time };
  }
  return { primary: time };
}

/**
 * @deprecated Prefer mapBubbleContent — single-string helper for tests/callers
 * that only need the primary line.
 */
export function formatMapBubbleLabel(
  event: StockholmEvent,
  options: { showTitle?: boolean; now?: Date } = {},
): string {
  return mapBubbleContent(event, options).primary;
}
