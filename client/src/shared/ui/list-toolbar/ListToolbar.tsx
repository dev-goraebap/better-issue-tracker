import { Button, Dialog, HStack, Token } from '@astryxdesign/core';
import { DialogHeader } from '@astryxdesign/core/Dialog';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { FloatingAction } from '../floating-action';
import { NavIcon } from '../NavIcon';
import { SearchTrigger } from '../search-palette';
import { FilterPanel } from './FilterPanel';
import { usePageTools } from '../page-chrome';
import { FilterSheetButton } from './FilterSheetButton';
import { HeaderTools } from './HeaderTools';
import { InlineFilters } from './InlineFilters';
import { MobileTools } from './MobileTools';
import { SortMenuButton } from './SortMenuButton';
import type { ListSort } from '../sort-menu';
import { SearchField } from './SearchField';
import styles from './list-toolbar.module.css';

export type ListOption = { value: string; label: string; icon?: ReactNode };
/**
 * One way to narrow a list; no value means everything. Up to two options show as radios, more as a selector, and a
 * searchable one (people, say) as a combobox.
 */
export type ListFilter = {
  key: string; label: string; value?: string; options: ListOption[]; isLoading?: boolean; isSearchable?: boolean;
  /** A NavIcon name shown before the filter's label. */
  icon?: string;
  /**
   * range picks a span of dates instead of an option: its value is "from~to" (ISO dates) and it has no options.
   */
  kind?: 'range';
  /**
   * Picks any number of the options, for long lists such as departments or tags; the value holds them joined by commas
   * ("a,b"), which is also how the URL and the server take them.
   */
  isMultiple?: boolean;
};

/** A multiple filter's chosen values, and back; nothing chosen is no value. */
export const valuesOf = (value?: string) => (value ? value.split(',').filter(Boolean) : []);
export const joinValues = (values: readonly string[]) => (values.length > 0 ? values.join(',') : undefined);
/** The options a filter has chosen: any number for a multiple one, at most one otherwise, none for a date span. */
export const chosenOf = (filter: ListFilter): string[] =>
  (filter.kind === 'range' ? [] : filter.isMultiple ? valuesOf(filter.value) : filter.value ? [filter.value] : []);

/** A date span as a range filter's value, and back. */
export const rangeValue = (from?: string, to?: string) => (from && to ? `${from}~${to}` : undefined);
export function rangeOf(value?: string): { from?: string; to?: string } {
  const [from, to] = value?.split('~') ?? [];
  return from && to ? { from, to } : {};
}
/** A date (ISO) as a short month and day: 10월 6일. */
export const shortDate = (value: string) => `${Number(value.slice(5, 7))}월 ${Number(value.slice(8, 10))}일`;
/** Every filter taken off. */
export const clearedValues = (filters: readonly ListFilter[]): ListFilterValues =>
  Object.fromEntries(filters.map(filter => [filter.key, undefined]));
/** Filters to choose among, as a menu's options: each its name and icon. */
export const filterChoices = (filters: readonly ListFilter[]): ListOption[] =>
  filters.map(filter => ({ value: filter.key, label: filter.label, icon: filter.icon && <NavIcon name={filter.icon} /> }));
/** What a set filter reads as: its option's name, or a range's span. */
export function filterValueText(filter: ListFilter): string {
  if (filter.kind === 'range') {
    const { from, to } = rangeOf(filter.value);
    return from && to ? (from === to ? shortDate(from) : `${shortDate(from)}~${shortDate(to)}`) : '';
  }
  if (filter.isMultiple) {
    const chosen = valuesOf(filter.value);
    const first = filter.options.find(option => option.value === chosen[0])?.label ?? '선택함';
    return chosen.length > 1 ? `${first} 외 ${chosen.length - 1}` : first;
  }
  return filter.options.find(option => option.value === filter.value)?.label ?? '선택함';
}
export type ListFilterValues = Record<string, string | undefined>;
/** A list's search by words: its name, the box's hint, the words applied, and where new words go. */
export type ListSearch = { label: string; placeholder: string; value?: string; onChange: (value: string | undefined) => void };
/** A list's main action; isCreate marks one that makes something new. */
export type ListAction = { label: string; icon?: string; onClick: () => void; isCreate?: boolean };
/** A list's orders as one choice each (최신순, 오래된순), for a page without the header chrome. */
export type ListOrder = { value: string; options: ListOption[]; onChange: (value: string) => void };


/**
 * The bar over every list, sticking under the card's header row as the list scrolls, directly above the list it narrows:
 * under the page's tabs when it has any, so a page with tabs and one without show the same bar.
 *
 * On a desktop the bar starts with the list's search (where narrowing by name is worth it) in a narrow box, then the
 * filters laid out beside it, each a compact selector applying at once, those that do not fit folded behind "필터 +N"
 * (InlineFilters). It ends with the order as an icon box with its menu, then the page's own buttons (end) and its
 * action, labelled, a create action filled. A list with none of these has no bar.
 *
 * On a phone the row is search and one button for the filters and the sort (the sort sits at the top of a bottom sheet);
 * the page's action to make something new floats as the + over the tab bar, and any other action (모두 읽음, say) ends
 * the row as an accent icon button. The filters in force show under it as tokens to take off one by one or all at once.
 * Search applies once typing pauses. A list with nothing worth searching by text leaves search out; the bar then starts
 * with its filters, and label names the bar for assistive technology instead.
 */
export function ListToolbar({ search, opener, label, filters = [], onFiltersChange, onFiltersOpenChange, sort, order, action, lead, end }: {
  search?: ListSearch;
  /** In place of a search field, an opener for the page's own search (a palette on a desktop, a page on a phone). */
  opener?: { label: string; onOpen: () => void };
  /** The bar's name when it has no search, such as "결재 조건". */
  label?: string;
  filters?: ListFilter[];
  onFiltersChange?: (values: ListFilterValues) => void;
  /**
   * Tells the page the filters' options are shown, so options it reads only then (writers, say) start loading: when the
   * sheet opens on a phone, at once on a desktop whose filters lie in the bar, and when the header chrome's filters row
   * shows. The names of filters already in force (an author's, say) are the page's to read whenever they are set.
   */
  onFiltersOpenChange?: (isOpen: boolean) => void;
  /** The list's orders as one choice each, for a page without the header chrome. */
  sort?: ListOrder;
  /** The list's order as a key and a way apart, for a page with the header chrome: its header and phone sheet choose them. */
  order?: ListSort;
  /**
   * The page's own action, at the far end of the bar as a labelled button on a desktop. On a phone an action that makes
   * something new (isCreate) floats as the + over the tab bar (FloatingAction); any other ends the row as an icon.
   */
  action?: ListAction;
  /** A desktop's other page buttons (설정으로, a 관리 menu), just before the action. */
  end?: ReactNode;
  /** A desktop header's first tool, before the search and the filters (a layout switcher, as Plane leads with its layouts). */
  lead?: ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isStuck = useStuck();
  // A desktop page in the header chrome takes the toolbar's tools into its header (HeaderTools).
  const pageTools = usePageTools();
  const inHeader = !!pageTools && !isMobile;
  const inline = !isMobile && !inHeader && filters.length > 0;
  // The filters folded out of an inline bar, in a dialog.
  const [folded, setFolded] = useState<ListFilter[] | undefined>();
  // Inline filters are in sight at once, so options read only when shown (writers, say) load now.
  useEffect(() => { if (inline) onFiltersOpenChange?.(true); }, [inline, onFiltersOpenChange]);
  if (inHeader) return <HeaderTools target={pageTools} search={search} filters={filters} onFiltersChange={onFiltersChange}
    onFiltersOpenChange={onFiltersOpenChange} sort={order} action={action} lead={lead} end={end} />;
  // A phone's page in the header chrome takes the tools into the toolbar; its create action floats as the +, another ends it.
  if (pageTools && isMobile) return <MobileTools target={pageTools} search={search} filters={filters} onFiltersChange={onFiltersChange}
    onFiltersOpenChange={onFiltersOpenChange} sort={order} action={action} />;
  const active = filters.filter(filter => filter.value !== undefined);
  const clear = () => onFiltersChange?.(clearedValues(filters));
  const tokens = active.map(filter => <Token key={filter.key} size="sm" label={`${filter.label}: ${filterValueText(filter)}`}
    onRemove={() => onFiltersChange?.({ [filter.key]: undefined })} />);
  const hasBar = isMobile || !!search || filters.length > 0 || !!sort || !!action || !!end;
  return <>{hasBar && <><div ref={isStuck.sentinel} className={styles.sentinel} aria-hidden="true" />
  <div className={styles.toolbar} data-stuck={isStuck.value || undefined} role="search" aria-label={search?.label ?? label ?? opener?.label ?? '목록 조건'}>
    <HStack gap={2} vAlign="center" wrap="nowrap" className={styles.bar} data-inline={inline || undefined}>
      {search && <SearchField {...search} />}
      {isMobile && opener && <SearchTrigger label={opener.label} onOpen={opener.onOpen} isWide />}
      {/* On a phone the sort joins the filters in the sheet. */}
      {isMobile && (filters.length > 0 || sort) && <FilterSheetButton filters={filters} sort={sort} isLabelShown={!search && !opener}
        onApply={values => onFiltersChange?.(values)} onOpenChange={onFiltersOpenChange} />}
      {isMobile && action && !action.isCreate && <Button label={action.label} tooltip={action.label} isIconOnly variant="primary"
        icon={<NavIcon name={action.icon ?? 'plus'} />} onClick={action.onClick} />}
      {inline && <InlineFilters filters={filters} onChange={values => onFiltersChange?.(values)} onOverflow={setFolded} />}
      {/* Without filters the rest of the bar still keeps to its end. */}
      {!isMobile && !inline && <span className={styles.desktopApplied} />}
      {!isMobile && sort && <SortMenuButton sort={sort} />}
      {!isMobile && (end || action) && <HStack gap={2} vAlign="center" className={styles.barAction} data-page-action>
        {end}
        {action && <Button label={action.label} variant={action.isCreate ? 'primary' : 'secondary'} icon={<NavIcon name={action.icon ?? 'plus'} />} onClick={action.onClick} />}
      </HStack>}
    </HStack>
    {isMobile && active.length > 0 && <HStack gap={2} vAlign="center" wrap="wrap" className={styles.applied}>
      {tokens}
      {active.length > 1 && <Button label="모두 지우기" variant="ghost" size="sm" onClick={clear} />}
    </HStack>}
  </div></>}
  {folded && <Dialog isOpen onOpenChange={isOpen => { if (!isOpen) setFolded(undefined); }} width={460} padding={0}>
    <FilterPanel header={<DialogHeader title="필터" onOpenChange={() => setFolded(undefined)} />} filters={folded}
      onApply={values => { onFiltersChange?.(values); setFolded(undefined); }} onCancel={() => setFolded(undefined)} />
  </Dialog>}
  {/* Outside the search landmark: the floating + is the page's action, not a search control. */}
  {action?.isCreate && <FloatingAction label={action.label} icon={action.icon} onClick={action.onClick} />}</>;
}

/**
 * Whether the bar has stuck under the top bar: a marker just above it scrolls up past the bar's sticky offset inside the
 * scrolling workspace. The bar's bottom rule fades in then, so it appears only when rows slide beneath it.
 */
function useStuck() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(false);
  useEffect(() => {
    const marker = sentinel.current;
    const bar = marker?.nextElementSibling;
    if (!marker || !bar) return undefined;
    let root: HTMLElement | null = marker.parentElement;
    while (root && !/(auto|scroll)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
    const offset = parseFloat(getComputedStyle(bar).top) || 0;
    const observer = new IntersectionObserver(([entry]) => setValue(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0) + 1),
      { root, rootMargin: `-${Math.ceil(offset) + 1}px 0px 0px 0px` });
    observer.observe(marker);
    return () => observer.disconnect();
  }, []);
  return { sentinel, value };
}
