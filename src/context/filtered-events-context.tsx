import { createContext, useContext, useDeferredValue, useMemo, type ReactNode } from 'react';

import { useFilters } from '@/context/filters-context';
import { useInterests } from '@/context/interests-context';
import { useEvents } from '@/hooks/use-events';
import { useUserLocation } from '@/hooks/use-user-location';
import type { StockholmEvent } from '@/types/event';
import { collapseSeries } from '@/utils/collapse-series';
import { dateRangeHeading, splitByDateRange } from '@/utils/date-range';
import { filterByDistance, sortByDistance, type GeoPoint } from '@/utils/geo';
import { orderFeed } from '@/utils/ranking';
import { searchEvents } from '@/utils/search';

type FilteredEventsValue = {
  events: StockholmEvent[];
  loading: boolean;
  error: Error | null;
  reload: () => void;
  listEvents: StockholmEvent[];
  listPending: boolean;
  nearStatus: string | null;
  location: GeoPoint | null;
  heading: string;
  now: Date;
};

const FilteredEventsContext = createContext<FilteredEventsValue | null>(null);

/**
 * One filter/rank pipeline (and one GPS fix) shared by Home, Explore and the
 * agenda so the surfaces never disagree and ~5k events are ranked once.
 */
export function FilteredEventsProvider({ children }: { children: ReactNode }) {
  const { data: events, loading, error, reload } = useEvents();
  const { category, query, dateRange, source, nearMe, nearRadiusKm } = useFilters();
  const now = useMemo(() => new Date(), []);
  const { location, loading: locating, error: locationError } = useUserLocation(nearMe);
  const { categories: interestCategories } = useInterests();

  const deferredInterests = useDeferredValue(interestCategories);
  const deferredQuery = useDeferredValue(query);
  const deferredCategory = useDeferredValue(category);
  const deferredSource = useDeferredValue(source);
  const deferredDateRange = useDeferredValue(dateRange);
  const deferredNearMe = useDeferredValue(nearMe);
  const deferredNearRadiusKm = useDeferredValue(nearRadiusKm);
  const deferredLocation = useDeferredValue(location);

  const listPending =
    deferredQuery !== query ||
    deferredCategory !== category ||
    deferredSource !== source ||
    deferredDateRange !== dateRange ||
    deferredNearMe !== nearMe ||
    deferredNearRadiusKm !== nearRadiusKm ||
    deferredLocation !== location;

  const baseFiltered = useMemo(() => {
    let result = searchEvents(events, deferredQuery);
    if (deferredCategory !== 'all') {
      result = result.filter((event) => event.category === deferredCategory);
    }
    if (deferredSource !== 'all') {
      result = result.filter((event) => event.source === deferredSource);
    }
    return result;
  }, [events, deferredQuery, deferredCategory, deferredSource]);

  const feedEvents = useMemo(() => {
    const { primary, secondary } = splitByDateRange(baseFiltered, deferredDateRange, now);
    const { events: collapsed } = collapseSeries([...primary, ...secondary]);
    return orderFeed(collapsed, now, { preferredCategories: deferredInterests });
  }, [baseFiltered, deferredDateRange, now, deferredInterests]);

  const listEvents = useMemo(() => {
    if (!deferredNearMe || !deferredLocation) return feedEvents;
    return sortByDistance(
      filterByDistance(feedEvents, deferredLocation, deferredNearRadiusKm),
      deferredLocation,
    );
  }, [feedEvents, deferredNearMe, deferredLocation, deferredNearRadiusKm]);

  const nearStatus = !nearMe
    ? null
    : locating
      ? 'Locating…'
      : locationError === 'denied'
        ? 'Location denied — enable it in Settings'
        : locationError
          ? 'Location unavailable'
          : null;

  const heading = dateRangeHeading(dateRange);

  const value = useMemo<FilteredEventsValue>(
    () => ({
      events,
      loading,
      error,
      reload,
      listEvents,
      listPending,
      nearStatus,
      location,
      heading,
      now,
    }),
    [events, loading, error, reload, listEvents, listPending, nearStatus, location, heading, now],
  );

  return <FilteredEventsContext.Provider value={value}>{children}</FilteredEventsContext.Provider>;
}

export function useFilteredEvents(): FilteredEventsValue {
  const context = useContext(FilteredEventsContext);
  if (!context) {
    throw new Error('useFilteredEvents must be used within a FilteredEventsProvider');
  }
  return context;
}
