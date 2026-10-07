import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { FilterSheet } from '@/components/filter-sheet';
import { useFilteredEvents } from '@/context/filtered-events-context';
import type { StockholmEvent } from '@/types/event';

/** How a surface counts its results for the sheet's CTA (list rows, map pins, …). */
export type ResultCounter = (listEvents: readonly StockholmEvent[]) => number;

const countListEvents: ResultCounter = (events) => events.length;

type FilterSheetValue = {
  openFilters: (counter?: ResultCounter) => void;
};

const FilterSheetContext = createContext<FilterSheetValue | null>(null);

/** Owns the single FilterSheet instance; screens only call `openFilters`. */
export function FilterSheetProvider({ children }: { children: ReactNode }) {
  const { events, listEvents, nearStatus } = useFilteredEvents();
  const [visible, setVisible] = useState(false);
  const [counter, setCounter] = useState<ResultCounter>(() => countListEvents);

  const openFilters = useCallback((next: ResultCounter = countListEvents) => {
    setCounter(() => next);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);

  const resultCount = useMemo(() => counter(listEvents), [counter, listEvents]);
  const value = useMemo<FilterSheetValue>(() => ({ openFilters }), [openFilters]);

  return (
    <FilterSheetContext.Provider value={value}>
      {children}
      <FilterSheet
        events={events}
        visible={visible}
        onClose={close}
        nearStatus={nearStatus}
        resultCount={resultCount}
      />
    </FilterSheetContext.Provider>
  );
}

export function useFilterSheet(): FilterSheetValue {
  const context = useContext(FilterSheetContext);
  if (!context) {
    throw new Error('useFilterSheet must be used within a FilterSheetProvider');
  }
  return context;
}
