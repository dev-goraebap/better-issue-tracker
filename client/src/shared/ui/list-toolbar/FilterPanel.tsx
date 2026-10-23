import { Button, HStack, MultiSelector, RadioList, RadioListItem, Text, VStack } from '@astryxdesign/core';
import { useState, type ReactNode } from 'react';
import { NavIcon } from '../NavIcon';
import { Select } from '../select';
import { joinValues, valuesOf, type ListFilter, type ListFilterValues, type ListOption } from './ListToolbar';
import { RangeFilter } from './RangeFilter';
import { SearchableFilter } from './SearchableFilter';
import styles from './list-toolbar.module.css';

const ALL = '';
/** Filters with up to two options (and 전체) show as radios, longer ones as a selector. */
const RADIO_MAX = 3;

/**
 * The filters as a draft, in a ruled header, body and footer: nothing applies until 적용, and 초기화 empties the draft.
 * On a phone the list's order leads the sheet. Each filter is headed by its icon and label. A multiple filter (departments,
 * tags) is a multi-select whose picks show as badges. A filter over people or other long lists is a combobox: type to narrow
 * it, or open it to pick from the whole list. In a bottom sheet the footer stays at the bottom while the body scrolls.
 * In a desktop's popover it is compact: tighter rules and fields of the regular size.
 */
export function FilterPanel({ header, filters, sort, isCompact, onApply, onCancel }: {
  header: ReactNode; filters: ListFilter[]; isCompact?: boolean;
  /** The list's order, chosen here on a phone and applied with the filters. */
  sort?: { value: string; options: ListOption[] };
  onApply: (values: ListFilterValues, sort?: string) => void; onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<ListFilterValues>(() => Object.fromEntries(filters.map(filter => [filter.key, filter.value])));
  const [order, setOrder] = useState(sort?.value);
  const size = isCompact ? 'md' : 'lg';
  const buttonSize = isCompact ? 'sm' : undefined;
  const set = (key: string, value?: string) => setDraft(current => ({ ...current, [key]: value === ALL ? undefined : value }));
  const control = (filter: ListFilter) => filter.kind === 'range'
    ? <RangeFilter filter={filter} value={draft[filter.key]} size={size} onChange={value => set(filter.key, value)} />
    : filter.isMultiple
    ? <MultiSelector label={filter.label} isLabelHidden size={size} placeholder="전체" triggerDisplay="badges" maxBadges={3} hasClear
      options={filter.options.map(option => ({ value: option.value, label: option.label, icon: option.icon }))} value={valuesOf(draft[filter.key])}
      hasSearch={filter.isSearchable} searchPlaceholder={`${filter.label} 찾기`} emptySearchText="찾는 항목이 없습니다" isLoading={filter.isLoading}
      onChange={values => set(filter.key, joinValues(values))} />
    : filter.isSearchable
    ? <SearchableFilter filter={filter} size={size} value={draft[filter.key]} onChange={value => set(filter.key, value)} />
    : filter.options.length + 1 <= RADIO_MAX && !filter.isLoading
      ? <RadioList label={filter.label} isLabelHidden orientation="horizontal" value={draft[filter.key] ?? ALL} onChange={next => set(filter.key, next)}>
        {[{ value: ALL, label: '전체' }, ...filter.options].map(option => <RadioListItem key={option.value} value={option.value} label={option.label} />)}
      </RadioList>
      : <Select label={filter.label} isLabelHidden size={size} options={[{ value: ALL, label: '전체' }, ...filter.options]} value={draft[filter.key] ?? ALL}
        onChange={next => set(filter.key, next)} isDisabled={filter.isLoading} />;
  return <div className={styles.panel} data-compact={isCompact || undefined}>
    <div className={styles.panelHead}>{header}</div>
    <VStack gap={isCompact ? 4 : 6} className={styles.panelBody}>
      {sort && <VStack gap={2}>
        <HStack gap={2} vAlign="center" className={styles.filterLabel}><NavIcon name="sort" /><Text type="label">정렬</Text></HStack>
        {/* More than three orders do not fit a phone's width side by side, so they stack. */}
        <RadioList label="정렬" isLabelHidden orientation={sort.options.length > RADIO_MAX ? 'vertical' : 'horizontal'} value={order ?? sort.value} onChange={setOrder}>
          {sort.options.map(option => <RadioListItem key={option.value} value={option.value} label={option.label} />)}
        </RadioList>
      </VStack>}
      {filters.map(filter => <VStack key={filter.key} gap={2}>
        <HStack gap={2} vAlign="center" className={styles.filterLabel}>
          <NavIcon name={filter.icon ?? 'filter'} /><Text type="label">{filter.label}</Text>
        </HStack>
        {control(filter)}
      </VStack>)}
    </VStack>
    <HStack gap={2} hAlign="between" vAlign="center" className={styles.panelFoot}>
      <Button label="초기화" variant="ghost" size={buttonSize} icon={<span className={styles.resetIcon}><NavIcon name="retry" /></span>} onClick={() => { setDraft({}); setOrder(sort?.options[0]?.value); }} />
      <HStack gap={2}>
        {onCancel && <Button label="취소" variant="ghost" size={buttonSize} onClick={onCancel} />}
        <Button label="적용" variant="primary" size={buttonSize} onClick={() => onApply(Object.fromEntries(filters.map(filter => [filter.key, draft[filter.key]])), order)} />
      </HStack>
    </HStack>
  </div>;
}
