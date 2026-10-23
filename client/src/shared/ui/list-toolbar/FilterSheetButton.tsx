import { BottomSheet, Button, Text } from '@astryxdesign/core';
import { useState } from 'react';
import { NavIcon } from '../NavIcon';
import { FilterPanel } from './FilterPanel';
import type { ListFilter, ListFilterValues, ListOption } from './ListToolbar';
import styles from './list-toolbar.module.css';

/**
 * A phone's one button for the filters (and the sort, when given): the filter icon alone, with how many conditions are
 * in force on it, opening them in a bottom sheet that applies them together. In a bar with no search beside it, the
 * button says its name (isLabelShown), so it does not sit there as a bare icon.
 */
export function FilterSheetButton({ filters, sort, onApply, onOpenChange, isLabelShown = false }: {
  filters: ListFilter[];
  isLabelShown?: boolean;
  sort?: { value: string; options: ListOption[]; onChange: (value: string) => void };
  onApply: (values: ListFilterValues) => void;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [isOpen, setOpen] = useState(false);
  const open = (next: boolean) => { setOpen(next); onOpenChange?.(next); };
  const sortChanged = !!sort && sort.value !== sort.options[0]?.value;
  const count = filters.filter(filter => filter.value !== undefined).length + (sortChanged ? 1 : 0);
  const label = sort ? '필터·정렬' : '필터';
  const apply = (values: ListFilterValues, sorted?: string) => {
    onApply(values);
    if (sort && sorted && sorted !== sort.value) sort.onChange(sorted);
    open(false);
  };
  return <>
    <span className={styles.trigger}>
      <Button label={count > 0 ? `${label} ${count}` : label} variant={count > 0 ? 'secondary' : 'ghost'} icon={<NavIcon name="filter" />}
        isIconOnly={!isLabelShown} tooltip={isLabelShown ? undefined : label} onClick={() => open(true)} />
      {count > 0 && !isLabelShown && <span className={styles.count}>{count}</span>}
    </span>
    {isOpen && <BottomSheet isOpen onOpenChange={open} label={label} height="hug">
      <FilterPanel header={<Text type="label">{label}</Text>} filters={filters} sort={sort} onApply={apply} />
    </BottomSheet>}
  </>;
}
