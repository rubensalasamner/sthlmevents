import { SegmentedControl, type SegmentedOption } from '@/components/segmented-control';
import { DATE_RANGES, DATE_RANGE_LABELS, type DateRangeValue } from '@/utils/date-range';

const OPTIONS: readonly SegmentedOption<DateRangeValue>[] = DATE_RANGES.map((range) => ({
  value: range,
  label: DATE_RANGE_LABELS[range],
}));

type DateFilterProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
};

export function DateFilter({ value, onChange }: DateFilterProps) {
  return (
    <SegmentedControl
      options={OPTIONS}
      value={value}
      onChange={onChange}
      accessibilityLabel="Filter by date"
    />
  );
}
