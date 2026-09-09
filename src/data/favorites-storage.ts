import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persists the favourite event ids on-device. AsyncStorage is backed by
 * SQLite/SharedPreferences natively and localStorage on web, so no login is
 * involved — each install keeps its own list.
 *
 * Kept as a tiny seam (load/save, not CRUD) so a later sync layer can wrap it
 * without touching the context.
 */
const FAVORITES_KEY = 'sthlmevents.favorites.v1';

export async function loadFavoriteIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    // Corrupt or unreadable storage — favourites are dispensable, start fresh.
    return new Set();
  }
}

export async function saveFavoriteIds(ids: ReadonlySet<string>): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
}
