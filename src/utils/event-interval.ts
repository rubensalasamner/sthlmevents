import type { StockholmEvent } from '@/types/event';

/**
 * Interval semantics for date filtering. An event occupies the interval
 * [startsAt, endsAt ?? startsAt]; a one-shot gig starts and ends there, while a
 * running exhibition spans months (Visit Stockholm returns ~1 in 5 events with
 * a start in the past and an end in the future — those must surface under
 * "Today" too, not vanish because their start predates the window).
 *
 * A range matches when the event's interval overlaps the window
 * (inclusive start, exclusive end) — not merely when `startsAt` falls inside it.
 */

export type DateWindow = {
  from: Date;
  /** Exclusive upper bound. */
  to: Date;
};

export function eventInterval(event: StockholmEvent): { startMs: number; endMs: number } {
  const startMs = new Date(event.startsAt).getTime();
  const endMs = event.endsAt ? new Date(event.endsAt).getTime() : startMs;
  return { startMs, endMs };
}

export function isOngoing(event: StockholmEvent, now: Date): boolean {
  const { startMs, endMs } = eventInterval(event);
  const nowMs = now.getTime();
  return startMs <= nowMs && endMs >= nowMs;
}

export function overlapsWindow(event: StockholmEvent, window: DateWindow): boolean {
  const { startMs, endMs } = eventInterval(event);
  const fromMs = window.from.getTime();
  const toMs = window.to.getTime();
  return startMs < toMs && endMs >= fromMs;
}
