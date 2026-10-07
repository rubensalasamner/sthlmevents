import type { CategoryFilterValue, NearRadiusKm } from '@/types/filters';
import { dateRangeHeading, type DateRangeValue } from '@/utils/date-range';
import { formatCategory } from '@/utils/format';

export type FilterFacet = {
  id: 'category' | 'near' | 'query';
  label: string;
};

/** Facets beyond the date window — date lives in the Home title / sheet When section. */
export function activeFilterFacets({
  category,
  nearMe,
  nearRadiusKm,
  query,
}: {
  category: CategoryFilterValue;
  nearMe: boolean;
  nearRadiusKm: NearRadiusKm;
  query: string;
}): FilterFacet[] {
  const facets: FilterFacet[] = [];
  if (category !== 'all') {
    facets.push({ id: 'category', label: formatCategory(category) });
  }
  if (nearMe) {
    facets.push({ id: 'near', label: nearRadiusKm ? `≤ ${nearRadiusKm} km` : 'Near me' });
  }
  const trimmed = query.trim();
  if (trimmed) {
    facets.push({ id: 'query', label: trimmed });
  }
  return facets;
}

/** Full summary for a11y / map when the date isn’t shown as a page title. */
export function filterSummaryLabel({
  dateRange,
  category,
  nearMe,
  nearRadiusKm,
  query,
}: {
  dateRange: DateRangeValue;
  category: CategoryFilterValue;
  nearMe: boolean;
  nearRadiusKm: NearRadiusKm;
  query: string;
}): string {
  const parts = [dateRangeHeading(dateRange), ...activeFilterFacets({ category, nearMe, nearRadiusKm, query }).map((f) => f.label)];
  return parts.join(' · ');
}
