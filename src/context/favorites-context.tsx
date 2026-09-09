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
    loadFavoriteIds().then((stored) => {
      if (!cancelled) {
        hydratedRef.current = true;
        setFavoriteIds(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    let next: Set<string>;
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
        if (next) void saveFavoriteIds(next);
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
