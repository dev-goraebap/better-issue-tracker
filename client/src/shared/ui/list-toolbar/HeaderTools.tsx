import { Button } from '@astryxdesign/core';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchScreen } from '@/shared/lib/route-search';
import { createPortal } from 'react-dom';
import { NavIcon } from '../NavIcon';
import type { PageTools } from '../page-chrome';
import { FilterBar, type Opened } from './FilterBar';
import { FilterMenu } from './FilterMenu';
import type { ListSort } from '../sort-menu';
import type { ListAction, ListFilter, ListFilterValues, ListSearch } from './ListToolbar';
import { SearchToggle } from './SearchToggle';
import { SortButton } from './SortButton';

/**
 * A list's toolbar in a page that uses the header chrome (a desktop): the search as a magnifier, the order, the 필터
 * button and the page's other buttons where the page keeps its tools (the tab row's end, or the header row's), the main
 * action last in the header row (filled when it makes something new), and the filters row (FilterBar) under the header.
 *
 * 필터 opens a menu of the filters first (FilterMenu), as Plane's does; a filter shows in the row only once a value is
 * chosen for it, so the row is there only while filters are in force (or one was just added from the row's +), and
 * 모두 지우기 puts it away.
 */
export function HeaderTools({ target, search, filters, onFiltersChange, onFiltersOpenChange, sort, action, lead, end }: {
  target: PageTools;
  search?: ListSearch;
  filters: ListFilter[]; onFiltersChange?: (values: ListFilterValues) => void; onFiltersOpenChange?: (isOpen: boolean) => void;
  sort?: ListSort;
  action?: ListAction;
  lead?: ReactNode;
  end?: ReactNode;
}) {
  const hasActive = filters.some(filter => filter.value !== undefined);
  const [shown, setShown] = useState<string[]>([]);
  const [opened, setOpened] = useState<Opened | undefined>();
  // A desktop has no search screen; an address asking for one (left by a phone) drops it.
  const { isOpen: isFinding, close: closeFinding } = useSearchScreen();
  useEffect(() => { if (isFinding) closeFinding(); }, [isFinding, closeFinding]);
  const isRowShown = hasActive || shown.length > 0;
  // The row lists the options, so options read only when shown (writers, say) load once it shows.
  useEffect(() => { if (isRowShown) onFiltersOpenChange?.(true); }, [isRowShown, onFiltersOpenChange]);
  const change = (values: ListFilterValues) => onFiltersChange?.(values);
  return <>
    {createPortal(<>
      {lead}
      {search && <SearchToggle {...search} />}
      {sort && <SortButton sort={sort} />}
      {filters.length > 0 && <FilterMenu filters={filters} onChange={change} onOpenChange={onFiltersOpenChange} />}
      {end}
    </>, target.tools)}
    {action && target.actions && createPortal(<Button label={action.label} variant={action.isCreate ? 'primary' : 'secondary'} size="sm" icon={<NavIcon name={action.icon ?? 'plus'} />} onClick={action.onClick} />, target.actions)}
    {filters.length > 0 && isRowShown && createPortal(<FilterBar filters={filters} shown={shown} onShownChange={setShown}
      opened={opened} onOpenedChange={setOpened} onChange={change} />, target.applied)}
  </>;
}
