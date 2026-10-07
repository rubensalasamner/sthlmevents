import type { SavedSnapshots } from '@/data/saved-snapshots-storage';
import type { StockholmEvent } from '@/types/event';
import { eventInterval } from '@/utils/event-interval';

/** Ended favourites stay visible under Past for this long, then their snapshot is dropped. */
export const SAVED_PAST_RETENTION_DAYS = 30;

const DAY_MS = 86_400_000;

/**
 * Next snapshot set: live copies refresh their snapshot, favourites missing
 * from the live feed keep the last one, and unfavourited or long-ended
 * entries are dropped.
 */
export function syncSnapshots(
  snapshots: SavedSnapshots,
  favoriteIds: ReadonlySet<string>,
  live: ReadonlyMap<string, StockholmEvent>,
  now: Date,
): SavedSnapshots {
  const cutoff = now.getTime() - SAVED_PAST_RETENTION_DAYS * DAY_MS;
  const next: Record<string, StockholmEvent> = {};
  for (const id of favoriteIds) {
    const event = live.get(id) ?? snapshots[id];
    if (!event || eventInterval(event).endMs < cutoff) continue;
    next[id] = event;
  }
  return next;
}

/** Same ids with the same `updatedAt` — nothing worth persisting. */
export function sameSnapshots(a: SavedSnapshots, b: SavedSnapshots): boolean {
  const aIds = Object.keys(a);
  if (aIds.length !== Object.keys(b).length) return false;
  return aIds.every((id) => b[id] !== undefined && b[id].updatedAt === a[id]!.updatedAt);
}

/** Favourites resolved to the live event when available, else the saved snapshot. */
export function resolveSavedEvents(
  favoriteIds: ReadonlySet<string>,
  live: ReadonlyMap<string, StockholmEvent>,
  snapshots: SavedSnapshots,
): StockholmEvent[] {
  const resolved: StockholmEvent[] = [];
  for (const id of favoriteIds) {
    const event = live.get(id) ?? snapshots[id];
    if (event) resolved.push(event);
  }
  return resolved;
}
