import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StockholmEvent } from '@/types/event';

/**
 * Last-seen copy of each saved event. The event sources drop anything that
 * has ended, so without this a favourite vanishes from Saved (and its detail
 * route 404s) the moment it is over.
 */
const SNAPSHOTS_KEY = 'sthlmevents.favorites.snapshots.v1';

export type SavedSnapshots = Readonly<Record<string, StockholmEvent>>;

function isSnapshot(value: unknown): value is StockholmEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<StockholmEvent>;
  return (
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    typeof event.startsAt === 'string' &&
    typeof event.venue === 'object' &&
    event.venue !== null
  );
}

export async function loadSavedSnapshots(): Promise<SavedSnapshots> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const snapshots: Record<string, StockholmEvent> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (isSnapshot(value) && value.id === id) snapshots[id] = value;
    }
    return snapshots;
  } catch {
    return {};
  }
}

export async function saveSavedSnapshots(snapshots: SavedSnapshots): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}
