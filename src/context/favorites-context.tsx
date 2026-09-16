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

import {
  loadFavoriteIds,
  saveFavoriteIds,
} from '@/data/favorites-storage';
import { getEventSource } from '@/data/event-repository';
import {
  cancelRemindersForEvent,
  rescheduleAllFavoriteReminders,
  scheduleRemindersForEvent,
} from '@/notifications/reminders';

type FavoritesContextValue = {
  favoriteIds: ReadonlySet<string>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  // Hydration write-guard: without it the empty initial state would overwrite
  // the stored list if a toggle landed before the async load resolved.
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadFavoriteIds()
      .then(async (stored) => {
        if (cancelled) return;
        hydratedRef.current = true;
        setFavoriteIds(stored);

        // Rebuild OS schedules for favourites that survived a reinstall /
        // permission revoke. Best-effort — never blocks hydration.
        if (stored.size === 0) return;
        const source = getEventSource();
        const events = (
          await Promise.all([...stored].map((id) => source.getById(id)))
        ).filter((event): event is NonNullable<typeof event> => event !== null);
        if (!cancelled) {
          void rescheduleAllFavoriteReminders(events);
        }
      })
      .catch((err: unknown) => {
        console.error('[favorites] hydration FAILED:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    let next: Set<string> | undefined;
    setFavoriteIds((current) => {
      next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (hydratedRef.current) {
      // Persist after the state update commits; the computed set mirrors what
      // React will render. Skipped pre-hydration so an early tap can't clobber
      // the stored list with the empty initial state.
      queueMicrotask(() => {
        if (!next) return;
        void saveFavoriteIds(next);
        // Reminder schedule follows the resulting membership, not a flip flag
        // (React may re-run the updater in Strict Mode).
        void (async () => {
          if (next!.has(id)) {
            const event = await getEventSource().getById(id);
            if (event) await scheduleRemindersForEvent(event);
          } else {
            await cancelRemindersForEvent(id);
          }
        })();
      });
    }
  }, []);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  const value = useMemo<FavoritesContextValue>(
    () => ({ favoriteIds, isFavorite, toggleFavorite }),
    [favoriteIds, isFavorite, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
