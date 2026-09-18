import { useDeferredValue, useMemo } from 'react';

import { useFilters } from '@/context/filters-context';
import { useInterests } from '@/context/interests-context';
import { useEvents } from '@/hooks/use-events';
import { useUserLocation } from '@/hooks/use-user-location';
import { collapseSeries } from '@/utils/collapse-series';
import { dateRangeHeading, splitByDateRange } from '@/utils/date-range';
import { filterByDistance, sortByDistance } from '@/utils/geo';
import { featuredEvents, orderFeed } from '@/utils/ranking';
import { searchEvents } from '@/utils/search';

/**
 * Shared Discover / Explore / agenda pipeline so the three surfaces never
 * disagree about the active filters.
 */
export function useFilteredEvents() {
  const { data: events, loading, error, reload } = useEvents();
  const {
    category,
    query,
    dateRange,
    source,
    nearMe,
    nearRadiusKm,
    contextualDateDefault,
  } = useFilters();
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

  const isDefaultView =
    deferredCategory === 'all' &&
    deferredDateRange === contextualDateDefault &&
    deferredSource === 'all' &&
    !deferredNearMe &&
    deferredQuery.trim() === '';

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

  const featured = useMemo(() => {
    if (!isDefaultView) return [];
    const { primary, secondary } = splitByDateRange(baseFiltered, deferredDateRange);
    return featuredEvents([...primary, ...secondary]);
  }, [baseFiltered, isDefaultView, deferredDateRange]);

  const feedEvents = useMemo(() => {
    const { primary, secondary } = splitByDateRange(baseFiltered, deferredDateRange);
    const merged = [...primary, ...secondary];
    const { events: collapsed } = collapseSeries(merged);
    return orderFeed(collapsed, now, { preferredCategories: deferredInterests });
  }, [baseFiltered, deferredDateRange, now, deferredInterests]);

  const listEvents = useMemo(() => {
    if (!deferredNearMe || !deferredLocation) return feedEvents;
    return sortByDistance(
      filterByDistance(feedEvents, deferredLocation, deferredNearRadiusKm),
      deferredLocation,
    );
  }, [feedEvents, deferredNearMe, deferredLocation, deferredNearRadiusKm]);

  const nearStatus =
    nearMe && locating
      ? 'Locating…'
      : nearMe && locationError === 'denied'
        ? 'Location denied'
        : nearMe && locationError
          ? 'Location unavailable'
          : null;

  return {
    events,
    loading,
    error,
    reload,
    listEvents,
    featured,
    isDefaultView,
    listPending,
    nearStatus,
    location,
    heading: dateRangeHeading(dateRange),
    now,
  };
}
