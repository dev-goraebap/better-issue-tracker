import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { DefaultAvatar, ListSummary, ListToolbar, PageState, sortOf, sortSearch, type ListFilter, type ListFilterValues, type ListSort } from '@/shared/ui';
import { filterWork, isNarrowed, PEOPLE, PRIORITY_LABELS, STATUS_LABELS, TABLE_SORT_KEYS, WorkRows, WorkTable, type TableSearch, type WorkItem, type WorkSearch } from '@/entities/demo-sample';

const SLICE = 10;

/**
 * PATTERN · 표 목록. A list of work items whose rows are compared by several properties: My Tasks and a project's 목록 view.
 *
 * - ListToolbar inside PageFrame chrome="header" puts the search, 필터 and the create action at the header row's end (or the
 *   tab row's end when the page has tabs); chosen filters show as chips under it. The page lays out none of it.
 * - A desktop shows SheetTable (WorkTable): the first column links the row, sortable headers set the order. A phone shows
 *   the rows as cards (WorkRows), the order moves into the filter sheet, and the create action floats as the +.
 * - The conditions live in the URL: the page parses them on its route and hands every change to onChange (search
 *   replaces history, filters and order push it).
 * - The list ends with ListSummary under its last row ('24개 중 10개 · 10개 더 보기'), SheetTable's foot on a desktop.
 *   Here the slices are local; a real page uses useInfiniteQuery and takes the total from the server.
 * - Empty and no-match are different states: no-match offers '조건 지우기'.
 */
export function DemoWorkList({ workspaceId, items, search, onChange, onCreate, lead, isAssigneeFixed = false }: {
  workspaceId: string; items: readonly WorkItem[]; search: WorkSearch;
  onChange: (patch: Partial<TableSearch>, replace?: boolean) => void; onCreate?: () => void;
  /** A desktop header's first tool, before the search (a project's view switch). */
  lead?: ReactNode;
  /** The list is one person's already (My Tasks), so it has no 담당자 filter. */
  isAssigneeFixed?: boolean;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [shown, setShown] = useState(SLICE);
  const change = (patch: Partial<TableSearch>, replace?: boolean) => { setShown(SLICE); onChange(patch, replace); };
  const order = useMemo<ListSort>(() => ({
    keys: TABLE_SORT_KEYS, ...sortOf(TABLE_SORT_KEYS, 'updated', search), usual: { key: 'updated', direction: 'desc' },
    onChange: (key, direction) => { setShown(SLICE); onChange(sortSearch(TABLE_SORT_KEYS, 'updated', key, direction)); },
  }), [search, onChange]);
  const rows = useMemo(() => filterWork(items, search, order), [items, search, order]);
  const filters: ListFilter[] = [
    { key: 'status', label: '상태', icon: 'status', value: search.status, isMultiple: true, options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })) },
    { key: 'priority', label: '우선순위', icon: 'priority', value: search.priority, options: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })) },
    ...(isAssigneeFixed ? [] : [{ key: 'assignee', label: '담당자', icon: 'person', value: search.assignee, isMultiple: true, isSearchable: true,
      options: PEOPLE.map(person => ({ value: person.id, label: person.name, icon: <DefaultAvatar seed={person.id} name={person.name} size={20} /> })) }]),
  ];
  const visible = rows.slice(0, shown);
  const summary = <ListSummary shown={visible.length} total={rows.length} step={SLICE} hasMore={shown < rows.length} onMore={() => setShown(shown + SLICE)} />;
  return <>
    <ListToolbar search={{ label: '작업 검색', placeholder: '제목이나 키로 찾기', value: search.q, onChange: q => change({ q }, true) }}
      filters={filters} onFiltersChange={(values: ListFilterValues) => change(values)} order={isMobile ? order : undefined} lead={lead}
      action={onCreate ? { label: '새 작업', icon: 'plus', onClick: onCreate, isCreate: true } : undefined} />
    {visible.length > 0 && (isMobile
      ? <><WorkRows workspaceId={workspaceId} rows={visible} search={search} />{summary}</>
      : <WorkTable workspaceId={workspaceId} rows={visible} search={search} order={order} foot={summary} />)}
    {rows.length === 0 && (isNarrowed(search)
      ? <PageState kind="search" title="조건에 맞는 작업이 없습니다" description="검색어나 필터를 바꿔 보세요."
        actions={<Button label="조건 지우기" variant="secondary" onClick={() => change({ q: undefined, status: undefined, priority: undefined, assignee: undefined })} />} />
      : <PageState title="아직 작업이 없습니다" description="첫 작업을 만들면 여기에 보입니다." actions={onCreate && <Button label="새 작업 만들기" variant="secondary" onClick={onCreate} />} />)}
  </>;
}
