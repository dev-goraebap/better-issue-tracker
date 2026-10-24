import { IconButton } from '@astryxdesign/core';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSearchScreen } from '@/shared/lib/route-search';
import { FloatingAction } from '../floating-action';
import { NavIcon } from '../NavIcon';
import type { PageTools } from '../page-chrome';
import { isUsualSort, type ListSort } from '../sort-menu';
import { FilterChips } from './FilterChips';
import { FilterSheet } from './FilterSheet';
import type { ListAction, ListDisplay, ListFilter, ListFilterValues, ListSearch, ListViews } from './ListToolbar';
import { SearchScreenBar } from './SearchScreenBar';
import { DisplaySheet } from './DisplaySheet';
import styles from './mobile-tools.module.css';

type Sheet = { kind: 'filter'; view: 'list' | string } | { kind: 'display' };

/**
 * A list's toolbar on a phone whose page uses the header chrome: the 필터, 표시 and search icons at the toolbar's end
 * (the page's create action floats as the +; any other action, 모두 읽음 say, ends the row as an accent icon), and the
 * conditions in force as chips under it.
 * The filters open in a two-step sheet (FilterSheet), the views and orders in a short one (DisplaySheet); both apply at once. Search opens the
 * search screen (useSearchScreen): the shell puts away its bars, the toolbar becomes the search bar over the list, and
 * the + steps aside.
 */
export function MobileTools({ target, search, filters, onFiltersChange, onFiltersOpenChange, sort, views, display, applied, action }: {
  target: PageTools;
  search?: ListSearch;
  filters: ListFilter[]; onFiltersChange?: (values: ListFilterValues) => void; onFiltersOpenChange?: (isOpen: boolean) => void;
  sort?: ListSort;
  views?: ListViews;
  display?: ListDisplay;
  applied?: ReactNode;
  action?: ListAction;
}) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const searchScreen = useSearchScreen();
  const change = (values: ListFilterValues) => onFiltersChange?.(values);
  const active = filters.filter(filter => filter.value !== undefined).length;
  const isChanged = display?.isChanged ?? ((!!sort && !isUsualSort(sort)) || (!!views && views.value !== views.options[0]?.value));
  // The sheet lists the options, so options read only when shown (writers, say) load once it opens.
  const isFilterSheet = sheet?.kind === 'filter';
  useEffect(() => { if (isFilterSheet) onFiltersOpenChange?.(true); }, [isFilterSheet, onFiltersOpenChange]);
  // A list with nothing to search (a tab searched by no name) has no search screen; an address asking for one drops it.
  const { isOpen: isFinding, close: closeFinding } = searchScreen;
  useEffect(() => { if (isFinding && !search) closeFinding(); }, [isFinding, search, closeFinding]);
  if (searchScreen.isOpen && search) return createPortal(<SearchScreenBar {...search} onClose={searchScreen.close} />, target.tools);
  return <>
    {createPortal(<>
      {filters.length > 0 && <span className={styles.toolWrap}>
        <IconButton label={active > 0 ? `필터 ${active}개 걸림` : '필터'} icon={<NavIcon name="filter" />} variant="ghost"
          onClick={() => setSheet({ kind: 'filter', view: 'list' })} />
        {active > 0 && <span className={styles.toolCount} aria-hidden="true">{active}</span>}
      </span>}
      {(sort || views || display) && <span className={styles.toolWrap}>
        <IconButton label="표시" icon={<NavIcon name="display" />} variant="ghost" onClick={() => setSheet({ kind: 'display' })} />
        {isChanged && <span className={styles.toolDot} aria-hidden="true" />}
      </span>}
      {search && <IconButton label={search.label} icon={<NavIcon name="search" />} variant="ghost" onClick={searchScreen.open} />}
      {action && !action.isCreate && <IconButton label={action.label} icon={<NavIcon name={action.icon ?? 'done'} />} variant="primary" onClick={action.onClick} />}
    </>, target.tools)}
    {createPortal(<FilterChips filters={filters} query={search?.value}
      onOpenFilter={key => setSheet({ kind: 'filter', view: key })} onRemove={key => change({ [key]: undefined })}
      onOpenSearch={searchScreen.open} onClearSearch={() => search?.onChange(undefined)} trailing={applied} />, target.applied)}
    {sheet?.kind === 'filter' && <FilterSheet filters={filters} view={sheet.view} onViewChange={view => setSheet({ kind: 'filter', view })}
      onChange={change} onClose={() => setSheet(null)} />}
    {action?.isCreate && <FloatingAction label={action.label} icon={action.icon} onClick={action.onClick} />}
    {sheet?.kind === 'display' && <DisplaySheet views={views} sort={sort} display={display} onClose={() => setSheet(null)} />}
  </>;
}
