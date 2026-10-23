import { Popover } from '@astryxdesign/core';
import type { ReactNode } from 'react';
import { NavIcon } from '../NavIcon';
import { FilterValues } from './FilterValues';
import { chosenOf, filterChoices, type ListFilter, rangeOf, shortDate } from './ListToolbar';
import { OptionList } from './OptionList';
import styles from './header-tools.module.css';

/**
 * One filter in the filters row: [property][values][×], its parts ruled off from one another. The property swaps for
 * one not yet in the row; the values open their choices (FilterValues).
 */
export function FilterChip({ filter, unused, isPropertyOpen, isValueOpen, onPropertyOpenChange, onValueOpenChange, onSwap, onRemove, onChange }: {
  filter: ListFilter; unused: ListFilter[];
  isPropertyOpen: boolean; isValueOpen: boolean;
  onPropertyOpenChange: (open: boolean) => void; onValueOpenChange: (open: boolean) => void;
  onSwap: (key: string) => void; onRemove: () => void; onChange: (value?: string) => void;
}) {
  const chosen = chosenOf(filter);
  return <span className={styles.chip} role="group" aria-label={`${filter.label} 필터`}>
    <Popover isOpen={isPropertyOpen} onOpenChange={onPropertyOpenChange} placement="below" alignment="start" width={240} label="필터 바꾸기" className={styles.menu}
      isEnabled={unused.length > 0}
      content={<OptionList label="필터 찾기" options={filterChoices(unused)} onPick={onSwap} />}>
      {({ ref, onClick }) => <span ref={ref} className={styles.chipPart}>
        <button type="button" className={styles.chipKey} aria-expanded={isPropertyOpen} disabled={unused.length === 0} onClick={onClick}>
          {filter.icon && <NavIcon name={filter.icon} />}{filter.label}
        </button>
      </span>}
    </Popover>
    <Popover isOpen={isValueOpen} onOpenChange={onValueOpenChange} placement="below" alignment="start" width={filter.kind === 'range' ? undefined : 260}
      label={`${filter.label} 고르기`} className={styles.menu}
      content={<FilterValues filter={filter} onChange={onChange} onDone={() => onValueOpenChange(false)} />}>
      {({ ref, onClick }) => <span ref={ref} className={styles.chipPart}>
        <button type="button" className={styles.chipValue} aria-expanded={isValueOpen} onClick={onClick}>
          {valueText(filter, chosen)}
        </button>
      </span>}
    </Popover>
    <button type="button" className={styles.chipRemove} aria-label={`${filter.label} 필터 지우기`} onClick={onRemove}><NavIcon name="close" /></button>
  </span>;
}

/** A chip's values: up to two names and "+N" for the rest; a date span or day; -- while nothing is picked. */
function valueText(filter: ListFilter, chosen: string[]): ReactNode {
  if (filter.kind === 'range') {
    const { from, to } = rangeOf(filter.value);
    if (!from || !to) return <span className={styles.chipEmpty}>--</span>;
    return <>{from === to ? shortDate(from) : `${shortDate(from)} ~ ${shortDate(to)}`}</>;
  }
  if (chosen.length === 0) return <span className={styles.chipEmpty}>--</span>;
  const labelOf = (value: string) => filter.options.find(option => option.value === value);
  return <>{chosen.slice(0, 2).map((value, index) => <span key={value} className={styles.chipName}>
    {index > 0 && <span className={styles.chipComma}>,</span>}{labelOf(value)?.icon}{labelOf(value)?.label ?? value}
  </span>)}{chosen.length > 2 && <span className={styles.chipMore}>+{chosen.length - 2}</span>}</>;
}
