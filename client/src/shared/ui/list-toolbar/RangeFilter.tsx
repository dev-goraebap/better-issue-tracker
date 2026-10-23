import { DateRangeInput } from '@astryxdesign/core';
import type { DateRange } from '@astryxdesign/core/DateRangeInput';
import { rangeOf, rangeValue, type ListFilter } from './ListToolbar';

/** A range filter's control: a span of dates picked on two months, cleared with its own button. */
export function RangeFilter({ filter, value, size, onChange }: {
  filter: ListFilter; value?: string; size: 'md' | 'lg'; onChange: (value?: string) => void;
}) {
  const { from, to } = rangeOf(value);
  return <DateRangeInput label={filter.label} isLabelHidden placeholder={filter.label} size={size} hasClear numberOfMonths={2}
    value={from && to ? { start: from, end: to } as DateRange : null}
    onChange={range => onChange(rangeValue(range?.start ?? undefined, range?.end ?? undefined))} />;
}
