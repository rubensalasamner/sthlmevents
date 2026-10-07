import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useFavorites } from '@/context/favorites-context';
import {
  loadSavedSnapshots,
  saveSavedSnapshots,
  type SavedSnapshots,
} from '@/data/saved-snapshots-storage';
import { useEvents } from '@/hooks/use-events';
import type { StockholmEvent } from '@/types/event';
import { resolveSavedEvents, sameSnapshots, syncSnapshots } from '@/utils/saved-events';

type SavedEventsValue = {
  saved: StockholmEvent[];
  loading: boolean;
  error: Error | null;
  reload: () => void;
  snapshotFor: (id: string) => StockholmEvent | null;
};

const SavedEventsContext = createContext<SavedEventsValue | null>(null);

/**
 * Resolves favourite ids to events and keeps a persisted snapshot of each, so
 * Saved and the detail route still work after the live feed drops an event.
 */
export function SavedEventsProvider({ children }: { children: ReactNode }) {
  const { favoriteIds, hydrated } = useFavorites();
  const { data: events, loading, error, reload } = useEvents();
  const [stored, setStored] = useState<SavedSnapshots>({});
  const [snapshotsHydrated, setSnapshotsHydrated] = useState(false);
  const persistedRef = useRef<SavedSnapshots>({});

  const live = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  useEffect(() => {
    let cancelled = false;
    void loadSavedSnapshots().then((stored) => {
      if (cancelled) return;
      persistedRef.current = stored;
      setStored(stored);
      setSnapshotsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = hydrated && snapshotsHydrated && !loading;
  const snapshots = useMemo(
    () => (ready ? syncSnapshots(stored, favoriteIds, live, new Date()) : stored),
    [ready, stored, favoriteIds, live],
  );

  useEffect(() => {
    if (!ready || sameSnapshots(persistedRef.current, snapshots)) return;
    persistedRef.current = snapshots;
    void saveSavedSnapshots(snapshots);
  }, [ready, snapshots]);

  const saved = useMemo(
    () => resolveSavedEvents(favoriteIds, live, snapshots),
    [favoriteIds, live, snapshots],
  );

  const snapshotFor = useCallback((id: string) => snapshots[id] ?? null, [snapshots]);

  const value = useMemo<SavedEventsValue>(
    () => ({
      saved,
      loading: loading || !hydrated || !snapshotsHydrated,
      error,
      reload,
      snapshotFor,
    }),
    [saved, loading, hydrated, snapshotsHydrated, error, reload, snapshotFor],
  );

  return <SavedEventsContext.Provider value={value}>{children}</SavedEventsContext.Provider>;
}

export function useSavedEvents(): SavedEventsValue {
  const context = useContext(SavedEventsContext);
  if (!context) {
    throw new Error('useSavedEvents must be used within a SavedEventsProvider');
  }
  return context;
}
