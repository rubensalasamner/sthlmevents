import type { CategoryFilterValue } from '@/components/category-filter';
import type { NearRadiusKm } from '@/components/near-me-filter';
import { dateRangeHeading, type DateRangeValue } from '@/utils/date-range';
import { formatCategory } from '@/utils/format';

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
  const parts = [dateRangeHeading(dateRange)];
  if (category !== 'all') parts.push(formatCategory(category));
  if (nearMe) parts.push(nearRadiusKm ? `≤ ${nearRadiusKm} km` : 'Near me');
  const trimmed = query.trim();
  if (trimmed) parts.push(trimmed);
  return parts.join(' · ');
}
