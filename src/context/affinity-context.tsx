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
  appendAffinitySignal,
  EMPTY_AFFINITY,
  loadAffinitySnapshot,
  saveAffinitySnapshot,
  unfollowOrganizer,
  unfollowVenue,
  type AffinitySnapshot,
} from '@/data/affinity-storage';
import type { EventCategory, StockholmEvent } from '@/types/event';
import {
  categoryAffinityMap,
  foldAffinityKey,
  scoreAffinityKeys,
} from '@/utils/affinity';

type AffinityContextValue = {
  hydrated: boolean;
  snapshot: AffinitySnapshot;
  keyScores: ReadonlyMap<string, number>;
  categoryScores: ReadonlyMap<EventCategory, number>;
  recordOpen: (event: StockholmEvent) => void;
  recordFavorite: (event: StockholmEvent) => void;
  isFollowingVenue: (venueName: string) => boolean;
  isFollowingOrganizer: (organizer: string) => boolean;
  toggleFollowVenue: (venueName: string) => void;
  toggleFollowOrganizer: (organizer: string) => void;
};

const AffinityContext = createContext<AffinityContextValue | null>(null);

function commit(next: AffinitySnapshot, hydrated: boolean): AffinitySnapshot {
  if (hydrated) {
    queueMicrotask(() => {
      void saveAffinitySnapshot(next);
    });
  }
  return next;
}

export function AffinityProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AffinitySnapshot>(() => ({
    ...EMPTY_AFFINITY,
    signals: [],
    followedVenues: [],
    followedOrganizers: [],
  }));
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const openedIdsRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    loadAffinitySnapshot()
      .then((stored) => {
        if (cancelled) return;
        hydratedRef.current = true;
        setSnapshot(stored);
        setHydrated(true);
      })
      .catch((err: unknown) => {
        console.error('[affinity] hydration FAILED:', err);
        if (!cancelled) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recordOpen = useCallback((event: StockholmEvent) => {
    if (openedIdsRef.current.has(event.id)) return;
    openedIdsRef.current.add(event.id);
    const at = Date.now();
    setSnapshot((current) =>
      commit(
        appendAffinitySignal(current, { kind: 'open', key: event.category, at }),
        hydratedRef.current,
      ),
    );
  }, []);

  const recordFavorite = useCallback((event: StockholmEvent) => {
    const at = Date.now();
    setSnapshot((current) => {
      let next = appendAffinitySignal(current, { kind: 'favorite', key: event.category, at });
      const venueKey = foldAffinityKey(event.venue.name);
      if (venueKey) {
        next = appendAffinitySignal(next, { kind: 'favorite', key: venueKey, at });
      }
      const organizerKey = foldAffinityKey(event.organizer);
      if (organizerKey && organizerKey !== venueKey) {
        next = appendAffinitySignal(next, { kind: 'favorite', key: organizerKey, at });
      }
      return commit(next, hydratedRef.current);
    });
  }, []);

  const isFollowingVenue = useCallback(
    (venueName: string) => {
      const key = foldAffinityKey(venueName);
      return key.length > 0 && snapshot.followedVenues.includes(key);
    },
    [snapshot.followedVenues],
  );

  const isFollowingOrganizer = useCallback(
    (organizer: string) => {
      const key = foldAffinityKey(organizer);
      return key.length > 0 && snapshot.followedOrganizers.includes(key);
    },
    [snapshot.followedOrganizers],
  );

  const toggleFollowVenue = useCallback((venueName: string) => {
    const key = foldAffinityKey(venueName);
    if (!key) return;
    setSnapshot((current) => {
      if (current.followedVenues.includes(key)) {
        return commit(unfollowVenue(current, key), hydratedRef.current);
      }
      return commit(
        appendAffinitySignal(current, { kind: 'follow_venue', key, at: Date.now() }),
        hydratedRef.current,
      );
    });
  }, []);

  const toggleFollowOrganizer = useCallback((organizer: string) => {
    const key = foldAffinityKey(organizer);
    if (!key) return;
    setSnapshot((current) => {
      if (current.followedOrganizers.includes(key)) {
        return commit(unfollowOrganizer(current, key), hydratedRef.current);
      }
      return commit(
        appendAffinitySignal(current, { kind: 'follow_organizer', key, at: Date.now() }),
        hydratedRef.current,
      );
    });
  }, []);

  const keyScores = useMemo(() => scoreAffinityKeys(snapshot), [snapshot]);
  const categoryScores = useMemo(() => categoryAffinityMap(keyScores), [keyScores]);

  const value = useMemo<AffinityContextValue>(
    () => ({
      hydrated,
      snapshot,
      keyScores,
      categoryScores,
      recordOpen,
      recordFavorite,
      isFollowingVenue,
      isFollowingOrganizer,
      toggleFollowVenue,
      toggleFollowOrganizer,
    }),
    [
      hydrated,
      snapshot,
      keyScores,
      categoryScores,
      recordOpen,
      recordFavorite,
      isFollowingVenue,
      isFollowingOrganizer,
      toggleFollowVenue,
      toggleFollowOrganizer,
    ],
  );

  return <AffinityContext.Provider value={value}>{children}</AffinityContext.Provider>;
}

export function useAffinity(): AffinityContextValue {
  const context = useContext(AffinityContext);
  if (!context) {
    throw new Error('useAffinity must be used within an AffinityProvider');
  }
  return context;
}
