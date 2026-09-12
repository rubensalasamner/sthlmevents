import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { CategoryFilterValue } from '@/components/category-filter';
import type { SourceFilterValue } from '@/components/source-filter';
import type { DateRangeValue } from '@/utils/date-range';

export type FiltersState = {
  category: CategoryFilterValue;
  query: string;
  dateRange: DateRangeValue;
  source: SourceFilterValue;
};

type FiltersContextValue = FiltersState & {
  setCategory: (value: CategoryFilterValue) => void;
  setQuery: (value: string) => void;
  setDateRange: (value: DateRangeValue) => void;
  setSource: (value: SourceFilterValue) => void;
  /** True when any filter deviates from its default. */
  isActive: boolean;
  reset: () => void;
};

const DEFAULTS: FiltersState = {
  category: 'all',
  query: '',
  dateRange: 'all',
  source: 'all',
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

/**
 * Shared filter state for the Discover list and the Map screen so both
 * present the same selection (weekend + food filters the pins too).
 */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [category, setCategory] = useState<CategoryFilterValue>(DEFAULTS.category);
  const [query, setQuery] = useState(DEFAULTS.query);
  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULTS.dateRange);
  const [source, setSource] = useState<SourceFilterValue>(DEFAULTS.source);

  const isActive =
    category !== DEFAULTS.category ||
    dateRange !== DEFAULTS.dateRange ||
    source !== DEFAULTS.source;

  const reset = useCallback(() => {
    setCategory(DEFAULTS.category);
    setQuery(DEFAULTS.query);
    setDateRange(DEFAULTS.dateRange);
    setSource(DEFAULTS.source);
  }, []);

  const value = useMemo<FiltersContextValue>(
    () => ({ category, query, dateRange, source, setCategory, setQuery, setDateRange, setSource, isActive, reset }),
    [category, query, dateRange, source, isActive, reset],
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
