import { Calendar } from '@astryxdesign/core';
import type { DateRange, ISODateString } from '@astryxdesign/core/Calendar';
import { useState } from 'react';
import { chosenOf, joinValues, rangeOf, rangeValue, type ListFilter } from './ListToolbar';
import { OptionList } from './OptionList';
import styles from './header-tools.module.css';

/**
 * One filter's values to choose, the same in a desktop chip's popover and a phone's sheet: its options with a search box
 * (several kept open for more, one closing once chosen, onDone), or for dates a calendar that picks one day or a span
 * (a choice over it; a span until the viewer picks a day), closing once picked. size lg gives a phone's touch rows.
 */
export function FilterValues({ filter, onChange, onDone, size = 'sm' }: {
  filter: ListFilter; onChange: (value?: string) => void; onDone: () => void; size?: 'sm' | 'lg';
}) {
  const { from, to } = rangeOf(filter.value);
  const [isDay, setDay] = useState(!!from && from === to);
  if (filter.kind === 'range') {
    const setDayMode = (day: boolean) => {
      setDay(day);
      // A span keeps its first day; a day becomes a span of that one day.
      if (day && from) onChange(rangeValue(from, from));
    };
    return <div className={styles.calendar} data-size={size}>
      <div className={styles.dayMode} role="radiogroup" aria-label="고르는 방식">
        {([[true, '하루'], [false, '기간']] as const).map(([day, label]) => <button key={label} type="button" role="radio" aria-checked={isDay === day}
          className={styles.dayModeOption} onClick={() => setDayMode(day)}>{label}</button>)}
      </div>
      {isDay
        ? <Calendar value={from as ISODateString | undefined} onChange={day => { onChange(rangeValue(day, day)); onDone(); }} />
        : <Calendar mode="range" numberOfMonths={size === 'lg' ? 1 : 2} value={from && to ? { start: from, end: to } as DateRange : undefined}
          onChange={range => { if (range.start && range.end) { onChange(rangeValue(range.start, range.end)); onDone(); } }} />}
    </div>;
  }
  if (filter.isLoading) return <p className={styles.note}>불러오는 중…</p>;
  const chosen = chosenOf(filter);
  const pick = (option: string) => {
    if (!filter.isMultiple) { onChange(filter.value === option ? undefined : option); onDone(); return; }
    onChange(joinValues(chosen.includes(option) ? chosen.filter(each => each !== option) : [...chosen, option]));
  };
  return <OptionList label={`${filter.label} 찾기`} options={filter.options} chosen={chosen} isMultiple={filter.isMultiple} onPick={pick} size={size} />;
}
