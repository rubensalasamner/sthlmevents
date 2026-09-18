import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { CategoryFilterValue } from '@/components/category-filter';
import type { NearRadiusKm } from '@/components/near-me-filter';
import type { SourceFilterValue } from '@/components/source-filter';
import { defaultDateRange, type DateRangeValue } from '@/utils/date-range';

export type FiltersState = {
  category: CategoryFilterValue;
  query: string;
  dateRange: DateRangeValue;
  source: SourceFilterValue;
  nearMe: boolean;
  nearRadiusKm: NearRadiusKm;
};

type FiltersContextValue = FiltersState & {
  /** Contextual date default at session start (weekend Thu–Sun, else today). */
  contextualDateDefault: DateRangeValue;
  setCategory: (value: CategoryFilterValue) => void;
  setQuery: (value: string) => void;
  setDateRange: (value: DateRangeValue) => void;
  setSource: (value: SourceFilterValue) => void;
  setNearMe: (value: boolean) => void;
  setNearRadiusKm: (value: NearRadiusKm) => void;
  /** True when any filter deviates from its contextual default. */
  isActive: boolean;
  /** DEV source chips — unlocked by 5 taps on the Home heading. */
  devSourcesUnlocked: boolean;
  toggleDevSources: () => void;
  reset: () => void;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

/**
 * Shared filter state for the Discover list and the Map screen so both
 * present the same selection (weekend + food filters the pins too).
 */
export function FiltersProvider({ children }: { children: ReactNode }) {
  // Freeze the contextual default for this session so Thursday→Friday midnight
  // doesn't silently rewrite the user's current selection mid-browse.
  const contextualDateDefault = useMemo(() => defaultDateRange(new Date()), []);

  const [category, setCategory] = useState<CategoryFilterValue>('all');
  const [query, setQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>(contextualDateDefault);
  const [source, setSource] = useState<SourceFilterValue>('all');
  const [nearMe, setNearMe] = useState(false);
  const [nearRadiusKm, setNearRadiusKm] = useState<NearRadiusKm>(null);
  const [devSourcesUnlocked, setDevSourcesUnlocked] = useState(false);
  const toggleDevSources = useCallback(() => {
    if (__DEV__) setDevSourcesUnlocked((open) => !open);
  }, []);

  const isActive =
    category !== 'all' ||
    dateRange !== contextualDateDefault ||
    source !== 'all' ||
    nearMe;

  const reset = useCallback(() => {
    setCategory('all');
    setQuery('');
    setDateRange(contextualDateDefault);
    setSource('all');
    setNearMe(false);
    setNearRadiusKm(null);
  }, [contextualDateDefault]);

  const value = useMemo<FiltersContextValue>(
    () => ({
      category,
      query,
      dateRange,
      source,
      nearMe,
      nearRadiusKm,
      contextualDateDefault,
      setCategory,
      setQuery,
      setDateRange,
      setSource,
      setNearMe,
      setNearRadiusKm,
      isActive,
      devSourcesUnlocked,
      toggleDevSources,
      reset,
    }),
    [
      category,
      query,
      dateRange,
      source,
      nearMe,
      nearRadiusKm,
      contextualDateDefault,
      isActive,
      devSourcesUnlocked,
      toggleDevSources,
      reset,
    ],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersContextValue {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
