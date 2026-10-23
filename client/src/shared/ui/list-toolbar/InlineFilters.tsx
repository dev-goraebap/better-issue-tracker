import { Button, MultiSelector, Selector } from '@astryxdesign/core';
import { useLayoutEffect, useRef, useState } from 'react';
import { NavIcon } from '../NavIcon';
import { clearedValues, filterValueText, joinValues, type ListFilter, type ListFilterValues, valuesOf } from './ListToolbar';
import { RangeFilter } from './RangeFilter';
import styles from './list-toolbar.module.css';

/** The room between two controls of the row, as the row's gap sets it (var(--spacing-2)). */
const GAP = 8;

/**
 * The filters laid out in the bar on a desktop, each a compact selector that reads "읽음" when unset and "읽음: 안 읽음"
 * once set, with a long list (people, tags) searchable in its menu. They stay on one line: the row measures what fits
 * beside the search and the sort, in the filters' order, and folds the rest behind "필터 +N", which opens the dialog
 * with only those. 초기화 clears them all when any is set.
 */
export function InlineFilters({ filters, onChange, onOverflow }: {
  filters: ListFilter[]; onChange: (values: ListFilterValues) => void; onOverflow: (hidden: ListFilter[]) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(filters.length);
  const active = filters.filter(filter => filter.value !== undefined);
  const hidden = filters.slice(shown);
  const hiddenActive = hidden.filter(filter => filter.value !== undefined).length;

  // Every control is also drawn once, out of sight, so its width is known before deciding what fits.
  useLayoutEffect(() => {
    const container = row.current;
    const ruler = measure.current;
    if (!container || !ruler) return undefined;
    const fit = () => {
      const widths = [...ruler.querySelectorAll<HTMLElement>('[data-filter]')].map(element => element.offsetWidth);
      const more = ruler.querySelector<HTMLElement>('[data-more]')?.offsetWidth ?? 0;
      const reset = active.length > 0 ? (ruler.querySelector<HTMLElement>('[data-reset]')?.offsetWidth ?? 0) + GAP : 0;
      const room = container.clientWidth - reset;
      let used = 0;
      let count = 0;
      for (const [index, width] of widths.entries()) {
        const rest = index < widths.length - 1 ? more + GAP : 0;
        if (used + width + rest > room) break;
        used += width + GAP;
        count += 1;
      }
      setShown(count);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  });

  const control = (filter: ListFilter) => {
    if (filter.kind === 'range') return <RangeFilter filter={filter} value={filter.value} size="md" onChange={value => onChange({ [filter.key]: value })} />;
    const options = filter.options.map(option => ({ value: option.value, label: option.label, icon: option.icon }));
    // Several may be chosen: the menu keeps open to tick more, and the button reads "부서: 개발팀 외 2".
    if (filter.isMultiple) return <MultiSelector label={filter.label} isLabelHidden hasClear size="md" variant="ghost" width="max-content"
      startIcon={filter.icon ? <NavIcon name={filter.icon} /> : undefined} placeholder={filter.label}
      options={options} value={valuesOf(filter.value)} isLoading={filter.isLoading} hasSearch={filter.isSearchable}
      searchPlaceholder={`${filter.label} 찾기`} emptySearchText="찾는 항목이 없습니다"
      formatValue={() => `${filter.label}: ${filterValueText(filter)}`}
      onChange={values => onChange({ [filter.key]: joinValues(values) })} />;
    const chosen = filter.options.find(option => option.value === filter.value);
    return <Selector label={filter.label} isLabelHidden hasClear size="md" variant="ghost" width="max-content"
      startIcon={filter.icon ? <NavIcon name={filter.icon} /> : undefined} placeholder={filter.label}
      options={options} value={filter.value ?? null} isLoading={filter.isLoading} hasSearch={filter.isSearchable}
      searchPlaceholder={`${filter.label} 찾기`} emptySearchText="찾는 항목이 없습니다"
      renderValue={() => `${filter.label}: ${chosen?.label ?? ''}`}
      onChange={value => onChange({ [filter.key]: value ?? undefined })} />;
  };
  const clear = () => onChange(clearedValues(filters));
  return <div ref={row} className={styles.inline}>
    {filters.slice(0, shown).map(filter => <span key={filter.key} className={styles.inlineFilter} data-active={filter.value !== undefined || undefined}>
      {control(filter)}
    </span>)}
    {hidden.length > 0 && <Button label={hiddenActive ? `필터 +${hidden.length} · 적용 ${hiddenActive}` : `필터 +${hidden.length}`}
      variant={hiddenActive ? 'secondary' : 'ghost'} icon={<NavIcon name="filter" />} onClick={() => onOverflow(hidden)} />}
    {active.length > 0 && <Button label="초기화" variant="ghost" icon={<NavIcon name="retry" />} onClick={clear} />}
    <div ref={measure} className={styles.ruler} aria-hidden="true" inert>
      {filters.map(filter => <span key={filter.key} data-filter className={styles.inlineFilter} data-active={filter.value !== undefined || undefined}>
        {control(filter)}
      </span>)}
      <span data-more><Button label={active.length ? `필터 +${filters.length} · 적용 ${active.length}` : `필터 +${filters.length}`} variant="secondary" icon={<NavIcon name="filter" />} /></span>
      <span data-reset><Button label="초기화" variant="ghost" icon={<NavIcon name="retry" />} /></span>
    </div>
  </div>;
}
