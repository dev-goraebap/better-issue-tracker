import { Popover, Tooltip } from '@astryxdesign/core';
import { useState } from 'react';
import { NavIcon } from '../NavIcon';
import { FilterValues } from './FilterValues';
import { filterChoices, type ListFilter, type ListFilterValues } from './ListToolbar';
import { OptionList } from './OptionList';
import styles from './header-tools.module.css';

/**
 * The header's 필터 button, after Plane's: it opens a menu of the filters first, and a filter picked there turns the
 * menu into that filter's values (the head's back arrow returns to the filters). Only a value chosen there puts the
 * filter in force, and so a chip in the filters row under the header; picking one value closes the menu, several keep it
 * open for more.
 */
export function FilterMenu({ filters, onChange, onOpenChange }: {
  filters: ListFilter[]; onChange: (values: ListFilterValues) => void; onOpenChange?: (isOpen: boolean) => void;
}) {
  const [isOpen, setOpen] = useState(false);
  const [key, setKey] = useState<string | undefined>();
  const filter = filters.find(each => each.key === key);
  const hasActive = filters.some(each => each.value !== undefined);
  const openChange = (open: boolean) => {
    setOpen(open);
    setKey(undefined);
    // The menu lists the options, so options read only when shown (writers, say) load once it opens.
    if (open) onOpenChange?.(true);
  };
  return <Popover isOpen={isOpen} onOpenChange={openChange} placement="below" alignment="end" width={filter?.kind === 'range' ? undefined : 260}
    label={filter ? `${filter.label} 고르기` : '필터'} className={styles.menu}
    content={filter
      ? <div>
        <div className={styles.menuHead}>
          <button type="button" className={styles.menuBack} aria-label="필터 목록으로" onClick={() => setKey(undefined)}><NavIcon name="back" /></button>
          {filter.icon && <NavIcon name={filter.icon} />}<span>{filter.label}</span>
        </div>
        <FilterValues key={filter.key} filter={filter} onChange={value => onChange({ [filter.key]: value })} onDone={() => openChange(false)} />
      </div>
      : <OptionList label="필터 찾기" options={filterChoices(filters)} chosen={filters.filter(each => each.value !== undefined).map(each => each.key)}
        onPick={setKey} />}>
    {({ ref, onClick }) => <span ref={ref} className={styles.trigger}>
      <Tooltip content="필터 추가">
        <button type="button" className={styles.filterButton} aria-expanded={isOpen} onClick={onClick}
          aria-label={hasActive ? '필터, 적용 중' : undefined}><NavIcon name="filter" />필터</button>
      </Tooltip>
    </span>}
  </Popover>;
}
