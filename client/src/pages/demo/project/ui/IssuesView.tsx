import { useMemo, useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useNavigate } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { DefaultAvatar, ListSummary, ListToolbar, PageState, type ListDisplay, type ListFilter, type ListSort, type ListViews } from '@/shared/ui';
import {
  canEditView, FILTER_KEYS, filterIssues, ISSUE_LABELS, IssueRows, IssueTable, LABEL_COLORS, NO_FILTER, PEOPLE, PRIORITY_LABELS, setViewTweak, STATUS_LABELS,
  TABLE_SORT_KEYS, updateView, VIEW_COLUMNS, VIEW_LAYOUTS, type Issue, type IssueSearch, type IssueView, type Status, type ViewColumn, type ViewLayout, type ViewTweak,
  type effectiveView,
} from '@/entities/demo-sample';
import type { DemoCalendarSearch } from '../model/month';
import type { Scope } from '../model/scope';
import { BoardView } from './BoardView';
import { DemoCalendar } from './DemoCalendar';
import { DemoCalendarBar } from './DemoCalendarBar';
import { TimelineView } from './TimelineView';
import styles from './views.module.css';

const SLICE = 15;
const same = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * PATTERN · 뷰 (D-066, D-068). The issues of the scope (전체 or a project) as the view in sight shows them: its filters
 * (and those the address changed over them), in its layout, order and columns, or the member's own adjustments to them.
 *
 * - The toolbar's 필터 narrows by status, priority, assignee and label; a filter changed from the view's own puts
 *   되돌리기 and 저장 at the filters row's end. 저장 writes the filters into the view when the member may change it, and
 *   otherwise (전체 이슈, a view of someone else's) makes a new view from them (onSaveAsView).
 * - 표시 picks the layout, the order and the columns shown; they stay the member's own (setViewTweak) until 초기화 drops
 *   them or '모두의 기본값으로 저장' writes them into the view for everyone.
 * - 리스트 shows every issue (a table on a desktop, cards on a phone), 칸반 those with a status, 캘린더 those with a day,
 *   타임라인 those with a day as bars.
 */
export function IssuesView({ scope, view, tweak, effective, issues, search, go, onCreate, onSaveAsView }: {
  scope: Scope; view: IssueView; tweak?: ViewTweak; effective: ReturnType<typeof effectiveView>;
  issues: readonly Issue[]; search: IssueSearch; go: (patch: Partial<IssueSearch>, replace?: boolean) => void;
  onCreate?: (status?: Status) => void; onSaveAsView: () => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const navigate = useNavigate();
  const [shown, setShown] = useState(SLICE);
  const { workspaceId, projectIds } = scope;
  const canEdit = canEditView(view);
  const rows = useMemo(() => filterIssues(issues.filter(issue => projectIds.includes(issue.projectId)), effective.filters, effective.sort, search.q),
    [issues, projectIds, effective.filters, effective.sort, search.q]);
  // A member's adjustment that comes back to the view's own is no adjustment.
  const adjust = (patch: ViewTweak) => {
    const next = { ...tweak, ...patch };
    setViewTweak(view.id, {
      layout: next.layout && next.layout !== view.layout ? next.layout : undefined,
      sort: next.sort && !same(next.sort, view.sort) ? next.sort : undefined,
      columns: next.columns && !same(next.columns, view.columns) ? next.columns : undefined,
    });
  };
  const filters: ListFilter[] = [
    { key: 'status', label: '상태', icon: 'status', value: effective.filters.status, isMultiple: true, options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })) },
    { key: 'priority', label: '우선순위', icon: 'priority', value: effective.filters.priority, options: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })) },
    { key: 'assignee', label: '담당자', icon: 'person', value: effective.filters.assignee, isMultiple: true, isSearchable: true,
      options: PEOPLE.map(person => ({ value: person.id, label: person.name, icon: <DefaultAvatar seed={person.id} name={person.name} size={20} /> })) },
    { key: 'label', label: '라벨', icon: 'label', value: effective.filters.label, isMultiple: true, isSearchable: true,
      options: ISSUE_LABELS.map(label => ({ value: label, label, icon: <span className={styles.labelDot} style={{ background: LABEL_COLORS[label] }} /> })) },
  ];
  // The address keeps only a filter that differs from the view's own ('-' for one taken off).
  const changeFilters = (values: Record<string, string | undefined>) => {
    setShown(SLICE);
    const patch: Partial<IssueSearch> = {};
    for (const key of FILTER_KEYS) {
      if (!(key in values)) continue;
      const value = values[key];
      patch[key] = (value ?? '') === (view.filters[key] ?? '') ? undefined : value ?? NO_FILTER;
    }
    go(patch);
  };
  const revert = () => go(Object.fromEntries(FILTER_KEYS.map(key => [key, undefined])));
  const saveFilters = () => {
    if (!canEdit) { onSaveAsView(); return; }
    updateView(workspaceId, view.id, { filters: effective.filters });
    revert();
  };
  const views: ListViews = { label: '보기 방식', value: effective.layout, options: [...VIEW_LAYOUTS], onChange: layout => adjust({ layout: layout as ViewLayout }) };
  const order: ListSort = { keys: TABLE_SORT_KEYS, key: effective.sort.key, direction: effective.sort.direction, usual: view.sort,
    onChange: (key, direction) => { setShown(SLICE); adjust({ sort: { key, direction } }); } };
  const display: ListDisplay = {
    isChanged: effective.isTweaked,
    columns: effective.layout === 'list' ? { label: '표시할 속성', options: VIEW_COLUMNS.map(column => ({ value: column.value, label: column.label })), value: effective.columns,
      onChange: next => adjust({ columns: VIEW_COLUMNS.map(column => column.value).filter(column => next.includes(column)) as ViewColumn[] }) } : undefined,
    foot: tweak ? <>
      <Button label="초기화" variant="ghost" size="sm" onClick={() => setViewTweak(view.id, undefined)} />
      {canEdit && <Button label={view.isPersonal ? '뷰에 저장' : '모두의 기본값으로 저장'} variant="secondary" size="sm"
        onClick={() => { updateView(workspaceId, view.id, { layout: effective.layout, sort: effective.sort, columns: effective.columns }); setViewTweak(view.id, undefined); }} />}
    </> : undefined,
  };
  const applied = effective.isFiltered ? <>
    <Button label="되돌리기" variant="ghost" size="sm" onClick={revert} />
    <Button label={canEdit ? '저장' : '뷰로 저장'} variant="secondary" size="sm" onClick={saveFilters} />
  </> : undefined;
  const create = onCreate && (() => onCreate());
  const calendarSearch: DemoCalendarSearch = { view: search.cal, date: search.date };
  const placeCalendar = (next: DemoCalendarSearch) => go({ cal: next.view === 'month' ? undefined : next.view, date: next.date });
  const isNarrowed = !!search.q || effective.isFiltered || Object.values(view.filters).some(Boolean);
  const visible = rows.slice(0, shown);
  const summary = <ListSummary shown={visible.length} total={rows.length} step={SLICE} hasMore={shown < rows.length} onMore={() => setShown(shown + SLICE)} />;
  const empty = (what: string, hint: string) => <PageState kind={isNarrowed ? 'search' : 'empty'} title={isNarrowed ? `조건에 맞는 ${what}이 없습니다` : `아직 ${what}이 없습니다`}
    description={isNarrowed ? '검색어나 필터를 바꿔 보세요.' : hint}
    actions={isNarrowed && (search.q || effective.isFiltered) ? <Button label="조건 지우기" variant="secondary" onClick={() => go({ q: undefined, ...Object.fromEntries(FILTER_KEYS.map(key => [key, undefined])) })} /> : undefined} />;
  const withStatus = rows.filter(row => row.status);
  return <>
    <ListToolbar search={{ label: '이슈 검색', placeholder: '제목이나 키로 찾기', value: search.q, onChange: q => { setShown(SLICE); go({ q }, true); } }}
      filters={filters} onFiltersChange={changeFilters} order={order} views={views} display={display} applied={applied}
      action={create && { label: '새 이슈', icon: 'plus', onClick: create, isCreate: true }} />
    {effective.layout === 'list' && (rows.length === 0 ? empty('이슈', '첫 이슈를 만들면 여기에 보입니다.') : isMobile
      ? <><IssueRows workspaceId={workspaceId} rows={visible} search={search} columns={effective.columns} />{summary}</>
      : <IssueTable workspaceId={workspaceId} rows={visible} search={search} columns={effective.columns} order={order} foot={summary} />)}
    {effective.layout === 'board' && (withStatus.length === 0 ? empty('상태가 있는 이슈', '이슈에 상태를 정하면 칸반의 칸에 놓입니다.')
      : <BoardView workspaceId={workspaceId} items={withStatus} search={search} onCreate={onCreate} />)}
    {effective.layout === 'calendar' && <div className={styles.calendarRoom}>
      <div className={styles.calendarBar}><DemoCalendarBar search={calendarSearch} onPlace={placeCalendar} /></div>
      <DemoCalendar workspaceId={workspaceId} issues={rows} search={calendarSearch} onPlace={placeCalendar} onOpen={href => void navigate({ href })} />
    </div>}
    {effective.layout === 'timeline' && <TimelineView workspaceId={workspaceId} items={rows} search={search} />}
  </>;
}
