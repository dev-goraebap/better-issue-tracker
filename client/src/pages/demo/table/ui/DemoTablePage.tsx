import { useCallback, useMemo, useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { DefaultAvatar, ListSummary, ListToolbar, PageFrame, PageState, sortOf, sortSearch, valuesOf, type ListFilter, type ListFilterValues, type ListSort } from '@/shared/ui';
import { isNarrowed, PEOPLE, PRIORITY_LABELS, PRIORITY_RANK, STATUS_LABELS, TABLE_SORT_KEYS, type TableSearch, WORK_ITEMS, type WorkItem } from '@/entities/demo-sample';
import { MobileRows } from './MobileRows';
import { WorkTable } from './WorkTable';

const SLICE = 10;

/**
 * PATTERN · 표 목록 (chrome="header"). Copy this page for a list whose rows are compared by several properties.
 *
 * - The shell's header row holds the trail and, at its end, the toolbar's tools (search magnifier, 필터, the action);
 *   chosen filters show as chips in a row under it. All of it comes from ListToolbar inside PageFrame chrome="header";
 *   the page lays out none of it.
 * - A desktop shows SheetTable (Plane's spreadsheet): the first column links the row (SHEET_ROW_LINK, so the whole row
 *   opens it), figures and dates are right or end aligned, sortable headers set the order (order prop).
 * - A phone shows the same rows as ItemList rows; the order moves into the filter sheet (ListToolbar order), and the
 *   create action floats as the + (isCreate).
 * - Search, filters and order live in the URL (parseTableSearch); search replaces history, filters and order push it.
 * - Empty and no-match are different states: no-match offers '조건 지우기'.
 * - A list read in slices ends with ListSummary, right under its last row: '24개 중 10개' and '14개 더 보기'. On a desktop it is
 *   SheetTable's foot, so the dot grid still fills under it. Here the slices are local; a real page uses useInfiniteQuery
 *   and takes the total from the server.
 */
export function DemoTablePage() {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const search = useSearch({ from: '/demo/table' });
  const navigate = useNavigate();
  const [shown, setShown] = useState(SLICE);
  const go = useCallback((patch: Partial<TableSearch>, replace = false) => {
    setShown(SLICE);
    void navigate({ to: '/demo/table', replace, search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)) });
  }, [navigate]);
  const order = useMemo<ListSort>(() => ({
    keys: TABLE_SORT_KEYS, ...sortOf(TABLE_SORT_KEYS, 'updated', search), usual: { key: 'updated', direction: 'desc' },
    onChange: (key, direction) => go(sortSearch(TABLE_SORT_KEYS, 'updated', key, direction)),
  }), [search, go]);
  const rows = useMemo(() => filterAndSort(search, order), [search, order]);
  const filters: ListFilter[] = [
    { key: 'status', label: '상태', icon: 'status', value: search.status, isMultiple: true, options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })) },
    { key: 'priority', label: '우선순위', icon: 'priority', value: search.priority, options: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })) },
    { key: 'assignee', label: '담당자', icon: 'person', value: search.assignee, isMultiple: true, isSearchable: true,
      options: PEOPLE.map(person => ({ value: person.id, label: person.name, icon: <DefaultAvatar seed={person.id} name={person.name} size={20} /> })) },
  ];
  const clear = () => go({ q: undefined, status: undefined, priority: undefined, assignee: undefined });
  const create = () => void navigate({ to: '/demo/items/new' });
  const visible = rows.slice(0, shown);
  const summary = <ListSummary shown={visible.length} total={rows.length} step={SLICE} hasMore={shown < rows.length} onMore={() => setShown(shown + SLICE)} />;
  return <PageFrame title="작업 표" icon="table" chrome="header">
    <ListToolbar search={{ label: '작업 검색', placeholder: '제목이나 키로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      filters={filters} onFiltersChange={(values: ListFilterValues) => go(values)}
      order={isMobile ? order : undefined}
      action={{ label: '새 작업', icon: 'plus', onClick: create, isCreate: true }} />
    {visible.length > 0 && (isMobile
      ? <><MobileRows rows={visible} search={search} />{summary}</>
      : <WorkTable rows={visible} search={search} order={order} foot={summary} />)}
    {rows.length === 0 && (isNarrowed(search)
      ? <PageState kind="search" title="조건에 맞는 작업이 없습니다" description="검색어나 필터를 바꿔 보세요." actions={<Button label="조건 지우기" variant="secondary" onClick={clear} />} />
      : <PageState title="아직 작업이 없습니다" description="첫 작업을 만들면 여기에 보입니다." actions={<Button label="새 작업 만들기" variant="secondary" onClick={create} />} />)}
  </PageFrame>;
}

/** The list a real server would return for these conditions: here filtered and ordered in memory. */
function filterAndSort(search: TableSearch, order: ListSort): WorkItem[] {
  const words = search.q?.toLowerCase();
  const statuses = valuesOf(search.status);
  const assignees = valuesOf(search.assignee);
  const sign = order.direction === 'asc' ? 1 : -1;
  return WORK_ITEMS
    .filter(item => !words || item.title.toLowerCase().includes(words) || item.key.toLowerCase().includes(words))
    .filter(item => statuses.length === 0 || statuses.includes(item.status))
    .filter(item => !search.priority || item.priority === search.priority)
    .filter(item => assignees.length === 0 || (item.assigneeId !== undefined && assignees.includes(item.assigneeId)))
    .sort((a, b) => {
      if (order.key === 'title') return sign * a.title.localeCompare(b.title, 'ko');
      if (order.key === 'priority') return sign * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      const field = order.key === 'created' ? 'createdAt' : 'updatedAt';
      return sign * a[field].localeCompare(b[field]);
    });
}
