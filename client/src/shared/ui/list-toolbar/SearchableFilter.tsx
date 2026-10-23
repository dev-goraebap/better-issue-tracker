import { HStack, Text, createStaticSource } from '@astryxdesign/core';
import { useMemo } from 'react';
import { NavIcon } from '../NavIcon';
import { SearchSelect } from '../select';
import type { ListFilter } from './ListToolbar';

/** A filter over a long list (people, say) as a combobox: type to narrow it, or open it to pick from the whole list. */
export function SearchableFilter({ filter, value, size = 'lg', onChange }: { filter: ListFilter; value?: string; size?: 'md' | 'lg'; onChange: (value?: string) => void }) {
  const items = useMemo(() => filter.options.map(option => ({ id: option.value, label: option.label, auxiliaryData: option.icon })), [filter.options]);
  const source = useMemo(() => createStaticSource(items), [items]);
  return <SearchSelect label={filter.label} isLabelHidden size={size} startIcon={<NavIcon name="search" />} placeholder={filter.isLoading ? '불러오는 중' : `${filter.label} 이름으로 찾기`}
    searchSource={source} value={items.find(item => item.id === value) ?? null} onChange={item => onChange(item?.id)}
    hasEntriesOnFocus debounceMs={0} isDisabled={filter.isLoading} emptySearchResultsText="찾는 이름이 없습니다"
    renderItem={item => <HStack gap={2} vAlign="center">{item.auxiliaryData}<Text>{item.label}</Text></HStack>} />;
}
