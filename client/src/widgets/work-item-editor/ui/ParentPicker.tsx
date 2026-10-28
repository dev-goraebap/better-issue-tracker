import { useDeferredValue, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { NavIcon, PropertyPicker, type PropertyOption } from '@/shared/ui';
import { workspaceItemsQuery, type WorkItem } from '@/entities/work-item';
import { TypeMark } from '@/entities/work-item-type';

/** The work item a new one is made under, as the form holds it. */
export type ParentChoice = Pick<WorkItem, 'id' | 'key' | 'title' | 'type'>;

/** The menu's row that takes the parent off, for a type that may stand alone. */
const NO_PARENT = 'none';
const optionOf = (item: ParentChoice): PropertyOption => ({ value: item.id, label: `${item.key} ${item.title}`, icon: item.type ? <TypeMark type={item.type} /> : undefined });

/**
 * 상위 업무 as a property pill (D-104): the workspace's work items of the types the new one may sit under (typeIds), found
 * by their title as the member types, 30 at a time. The one chosen stays at the menu's top whatever is typed, with
 * 상위 없음 under it unless the type must sit under one (isRequired).
 */
export function ParentPicker({ workspaceId, typeIds, value, isRequired, onChange }: {
  workspaceId: string; typeIds: readonly string[]; value?: ParentChoice; isRequired: boolean; onChange: (parent: ParentChoice | undefined) => void;
}) {
  const [words, setWords] = useState('');
  const search = useDeferredValue(words.trim());
  const found = useInfiniteQuery(workspaceItemsQuery(workspaceId, { q: search || undefined, typeId: [...typeIds], size: 30 }));
  const items = useMemo(() => found.data?.pages.flatMap(page => page.items) ?? [], [found.data]);
  const options = [...(value ? [optionOf(value), ...(isRequired ? [] : [{ value: NO_PARENT, label: '상위 없음', icon: <NavIcon name="close" /> }])] : []),
    ...items.filter(item => item.id !== value?.id).map(optionOf)];
  return <PropertyPicker label="상위 업무" icon="branch" options={options} value={value?.id} isRequired={isRequired} onSearch={setWords} isSearching={found.isFetching && !found.data}
    onChange={id => { if (id === NO_PARENT) onChange(undefined); else if (id !== value?.id) onChange(items.find(item => item.id === id)); }} />;
}
