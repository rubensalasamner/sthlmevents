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
  EMPTY_INTERESTS,
  loadInterestsSnapshot,
  saveInterestsSnapshot,
  shouldOfferInterestsPrompt,
  type InterestCategory,
  type InterestsSnapshot,
  type OnboardingStatus,
} from '@/data/interests-storage';

type InterestsContextValue = {
  hydrated: boolean;
  categories: ReadonlySet<InterestCategory>;
  onboarding: OnboardingStatus;
  /** True when the progressive sheet should present itself. */
  shouldPrompt: boolean;
  /** User opened the editor manually (chips row / “For you”). */
  editorOpen: boolean;
  openEditor: () => void;
  closeEditor: () => void;
  /** Persist chips and mark onboarding completed. */
  saveInterests: (categories: readonly InterestCategory[]) => void;
  skipOnboarding: () => void;
  recordEventOpen: (eventId: string) => void;
  recordFavoriteAdd: () => void;
};

const InterestsContext = createContext<InterestsContextValue | null>(null);

function commit(next: InterestsSnapshot, hydrated: boolean): InterestsSnapshot {
  if (hydrated) {
    queueMicrotask(() => {
      void saveInterestsSnapshot(next);
    });
  }
  return next;
}

export function InterestsProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<InterestsSnapshot>(EMPTY_INTERESTS);
  const [hydrated, setHydrated] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const hydratedRef = useRef(false);
  const openedIdsRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    loadInterestsSnapshot()
      .then((stored) => {
        if (cancelled) return;
        hydratedRef.current = true;
        setSnapshot(stored);
        setHydrated(true);
      })
      .catch((err: unknown) => {
        console.error('[interests] hydration FAILED:', err);
        if (!cancelled) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveInterests = useCallback((categories: readonly InterestCategory[]) => {
    setSnapshot((current) =>
      commit(
        { ...current, categories: [...categories], onboarding: 'completed' },
        hydratedRef.current,
      ),
    );
    setEditorOpen(false);
  }, []);

  const skipOnboarding = useCallback(() => {
    setSnapshot((current) =>
      commit({ ...current, onboarding: 'skipped' }, hydratedRef.current),
    );
    setEditorOpen(false);
  }, []);

  const recordEventOpen = useCallback((eventId: string) => {
    if (openedIdsRef.current.has(eventId)) return;
    openedIdsRef.current.add(eventId);
    setSnapshot((current) =>
      commit(
        { ...current, eventOpenCount: current.eventOpenCount + 1 },
        hydratedRef.current,
      ),
    );
  }, []);

  const recordFavoriteAdd = useCallback(() => {
    setSnapshot((current) =>
      commit(
        { ...current, favoriteAdds: current.favoriteAdds + 1 },
        hydratedRef.current,
      ),
    );
  }, []);

  const shouldPrompt = hydrated && shouldOfferInterestsPrompt(snapshot);

  const autoPromptedRef = useRef(false);
  useEffect(() => {
    if (!shouldPrompt || autoPromptedRef.current) return;
    autoPromptedRef.current = true;
    setEditorOpen(true);
  }, [shouldPrompt]);

  const categories = useMemo(() => new Set(snapshot.categories), [snapshot.categories]);

  const value = useMemo<InterestsContextValue>(
    () => ({
      hydrated,
      categories,
      onboarding: snapshot.onboarding,
      shouldPrompt,
      editorOpen,
      openEditor: () => setEditorOpen(true),
      closeEditor: () => setEditorOpen(false),
      saveInterests,
      skipOnboarding,
      recordEventOpen,
      recordFavoriteAdd,
    }),
    [
      hydrated,
      categories,
      snapshot.onboarding,
      shouldPrompt,
      editorOpen,
      saveInterests,
      skipOnboarding,
      recordEventOpen,
      recordFavoriteAdd,
    ],
  );

  return <InterestsContext.Provider value={value}>{children}</InterestsContext.Provider>;
}

export function useInterests(): InterestsContextValue {
  const context = useContext(InterestsContext);
  if (!context) {
    throw new Error('useInterests must be used within an InterestsProvider');
  }
  return context;
}
