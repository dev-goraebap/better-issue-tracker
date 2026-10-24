import { Popover, Tooltip } from '@astryxdesign/core';
import type { ReactNode } from 'react';
import { NavIcon } from '../NavIcon';
import { FilterChip } from './FilterChip';
import { clearedValues, filterChoices, type ListFilter, type ListFilterValues } from './ListToolbar';
import { OptionList } from './OptionList';
import styles from './header-tools.module.css';

/** Which of the row's menus is open: the + menu, or one chip's property or value menu. */
export type Opened = { key: '+' } | { key: string; part: 'property' | 'value' };

/**
 * The filters row under the header, after Plane's: a chip for each filter in force or just added, the + at the row's end
 * adding one of the filters not yet in the row (its values open at once), and 모두 지우기 last, which takes every filter
 * off, which puts the row away. A chip (FilterChip) reads [property][values][×].
 */
export function FilterBar({ filters, shown, onShownChange, opened, onOpenedChange, onChange, trailing }: {
  filters: ListFilter[];
  /** The filters the viewer added to the row, kept there while still empty. */
  shown: readonly string[]; onShownChange: (keys: string[]) => void;
  opened?: Opened; onOpenedChange: (opened?: Opened) => void;
  onChange: (values: ListFilterValues) => void;
  /** The page's own controls at the row's end, after 모두 지우기 (되돌리기, 저장 over a view, D-068). */
  trailing?: ReactNode;
}) {
  const inRow = filters.filter(filter => filter.value !== undefined || shown.includes(filter.key));
  const unused = filters.filter(filter => !inRow.includes(filter));
  const isOpen = (key: string, part?: 'property' | 'value') => opened?.key === key && (part === undefined || ('part' in opened && opened.part === part));
  const add = (key: string) => { onShownChange([...shown, key]); onOpenedChange({ key, part: 'value' }); };
  const remove = (key: string) => { onShownChange(shown.filter(each => each !== key)); onChange({ [key]: undefined }); onOpenedChange(undefined); };
  const swap = (from: string, to: string) => { onShownChange([...shown.filter(each => each !== from), to]); onChange({ [from]: undefined }); onOpenedChange({ key: to, part: 'value' }); };
  const clearAll = () => { onShownChange([]); onChange(clearedValues(filters)); onOpenedChange(undefined); };
  return <>
    {inRow.map(filter => <FilterChip key={filter.key} filter={filter} unused={unused}
      isPropertyOpen={isOpen(filter.key, 'property')} isValueOpen={isOpen(filter.key, 'value')}
      onPropertyOpenChange={open => onOpenedChange(open ? { key: filter.key, part: 'property' } : undefined)}
      onValueOpenChange={open => onOpenedChange(open ? { key: filter.key, part: 'value' } : undefined)}
      onSwap={to => swap(filter.key, to)} onRemove={() => remove(filter.key)}
      onChange={value => onChange({ [filter.key]: value })} />)}
    {unused.length > 0 && <Popover isOpen={isOpen('+')} onOpenChange={open => onOpenedChange(open ? { key: '+' } : undefined)} placement="below" alignment="start"
      width={240} label="필터 추가" className={styles.menu}
      content={<OptionList label="필터 찾기" options={filterChoices(unused)}
        onPick={add} />}>
      {({ ref, onClick }) => <span ref={ref} className={styles.trigger}>
        <Tooltip content="필터 추가"><button type="button" className={styles.addFilter} aria-label="필터 추가" aria-expanded={isOpen('+')}
          onClick={onClick}><NavIcon name="plus" /></button></Tooltip>
      </span>}
    </Popover>}
    <span className={styles.rowEnd}>
      {inRow.some(filter => filter.value !== undefined) && <button type="button" className={styles.clearAll} onClick={clearAll}>모두 지우기</button>}
      {trailing}
    </span>
  </>;
}
