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

import { loadFavoriteIds, saveFavoriteIds } from '@/data/favorites-storage';

type FavoritesContextValue = {
  favoriteIds: ReadonlySet<string>;
  hydrated: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/** Owns favourite membership + persistence only. Reminders live in FavoriteReminders. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  // Hydration write-guard: without it the empty initial state would overwrite
  // the stored list if a toggle landed before the async load resolved.
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadFavoriteIds()
      .then((stored) => {
        if (cancelled) return;
        hydratedRef.current = true;
        setFavoriteIds(stored);
        setHydrated(true);
      })
      .catch((err: unknown) => {
        console.error('[favorites] hydration FAILED:', err);
        if (!cancelled) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    let next: Set<string> | undefined;
    setFavoriteIds((current) => {
      next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (hydratedRef.current) {
      queueMicrotask(() => {
        if (next) void saveFavoriteIds(next);
      });
    }
  }, []);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  const value = useMemo<FavoritesContextValue>(
    () => ({ favoriteIds, hydrated, isFavorite, toggleFavorite }),
    [favoriteIds, hydrated, isFavorite, toggleFavorite],
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
