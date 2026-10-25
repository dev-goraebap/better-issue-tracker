import { useMemo, useState } from 'react';
import { Button, useToast } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { MOBILE_QUERY } from '@/shared/config';
import { authError } from '@/shared/api';
import { useGo } from '@/shared/lib/routed-panel';
import { DefaultAvatar, ListSummary, ListToolbar, PageState, type ListDisplay, type ListFilter, type ListSort, type ListViews } from '@/shared/ui';
import type { Label } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import type { Member } from '@/entities/workspace';
import {
  CATEGORY_LABELS, FILTER_KEYS, filterIssues, IssueRows, IssueTable, NO_FILTER, PRIORITIES, refreshItems, setViewTweak, SYSTEM_LABEL, updateItem,
  updateView, VIEW_COLUMNS, VIEW_LAYOUTS, VIEW_SORT_KEYS, type effectiveView, type IssueSearch, type IssueView, type ViewColumn, type ViewLayout, type ViewSort, type ViewTweak,
  type WorkItem,
} from '@/entities/work-item';
import { currentDay, shiftDay } from '../model/dates';
import type { Scope } from '../model/scope';
import { BoardView } from './BoardView';
import { CalendarBar } from './CalendarBar';
import { CardsView } from './CardsView';
import { HistoryView } from './HistoryView';
import { IssueCalendar } from './IssueCalendar';
import { TimelineView } from './TimelineView';
import styles from './views.module.css';

const SLICE = 50;
const same = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * PATTERN · 뷰 (D-066, D-068). The issues of the scope (전체 or a project) as the view in sight shows them: its filters
 * (and those the address changed over them), in its layout, order and columns, or the member's own adjustments to them.
 *
 * - The toolbar's 필터 narrows by status (its category, or 상태 없음), priority, assignee and label; a filter changed
 *   from the view's own puts 되돌리기 and 저장 at the filters row's end. 저장 writes the filters into the view when the
 *   member may change it, and otherwise (전체 이슈, a view of someone else's) makes a new view from them (onSaveAsView).
 * - 표시 picks the layout, the order and the columns shown; they stay the member's own (setViewTweak) until 초기화 drops
 *   them or '모두의 기본값으로 저장' writes them into the view for everyone.
 * - 리스트 shows every issue (a table on a desktop, cards on a phone), 칸반 those with a status, 캘린더 and 타임라인
 *   those with a day, 카드 every issue as Keep's cards, 히스토리 every issue down a timeline by month.
 */
export function IssuesView({ scope, view, tweak, effective, issues, labels, members, search, go, onCreate, onSaveAsView }: {
  scope: Scope; view: IssueView; tweak?: ViewTweak; effective: ReturnType<typeof effectiveView>; issues: readonly WorkItem[];
  labels: readonly Label[]; members: readonly Member[]; search: IssueSearch; go: (patch: Partial<IssueSearch>, replace?: boolean) => void;
  onCreate?: (status?: string) => void; onSaveAsView: () => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const client = useQueryClient();
  const toast = useToast();
  // An issue opened from the calendar goes where a pressed link would: into the page's modal (D-069).
  const openPage = useGo();
  const [shown, setShown] = useState(SLICE);
  const { workspaceId } = scope;
  const canEdit = view.canEdit;
  const rows = useMemo(() => filterIssues(issues, effective.filters, effective.sort, search.q), [issues, effective.filters, effective.sort, search.q]);
  // A row names its status by its column (검토 중), in 전체 too: there every project's columns are read.
  const allColumns = useQueries({ queries: scope.project ? [] : scope.projects.map(project => columnsQuery(scope.workspaceId, project.id)) });
  // Kept as one string so the map changes only when a column does (the query results are new arrays each render).
  const columnList = JSON.stringify([...scope.columns, ...allColumns.flatMap(result => result.data ?? [])].map(column => [column.id, column.name]));
  const columnNames = useMemo(() => new Map(JSON.parse(columnList) as [string, string][]), [columnList]);
  // A member's adjustment that comes back to the view's own is no adjustment.
  const adjust = (patch: ViewTweak) => {
    const next = { ...tweak, ...patch };
    void setViewTweak(client, workspaceId, view.id, {
      layout: next.layout && next.layout !== view.layout ? next.layout : undefined,
      sort: next.sort && !same(next.sort, view.sort) ? next.sort : undefined,
      columns: next.columns && !same(next.columns, view.columns) ? next.columns : undefined,
    });
  };
  const filters: ListFilter[] = [
    { key: 'status', label: '상태', icon: 'status', value: effective.filters.status, isMultiple: true, options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })) },
    { key: 'priority', label: '우선순위', icon: 'priority', value: effective.filters.priority, options: Object.entries(PRIORITIES).map(([value, label]) => ({ value, label })) },
    { key: 'assignee', label: '담당자', icon: 'person', value: effective.filters.assignee, isMultiple: true, isSearchable: true,
      options: members.map(member => ({ value: member.userId, label: member.name, icon: <DefaultAvatar seed={member.userId} name={member.name} size={20} /> })) },
    { key: 'label', label: '라벨', icon: 'label', value: effective.filters.label, isMultiple: true, isSearchable: true,
      options: labels.map(label => ({ value: label.system ? SYSTEM_LABEL : label.id, label: label.name, icon: <span className={styles.labelDot} style={{ background: label.color }} /> })) },
  ];
  // The address keeps only a filter that differs from the view's own ('-' for one taken off).
  const changeFilters = (values: Record<string, string | undefined>) => {
    setShown(SLICE);
    const patch: Partial<IssueSearch> = {};
    for (const key of FILTER_KEYS) {
      if (!(key in values)) continue;
      const value = values[key];
      patch[key] = ((value ?? '') === (view.filters[key] ?? '') ? undefined : value ?? NO_FILTER) as never;
    }
    go(patch);
  };
  const revert = () => go(Object.fromEntries(FILTER_KEYS.map(key => [key, undefined])));
  const saveFilters = () => {
    if (!canEdit) { onSaveAsView(); return; }
    void updateView(client, view, { filters: effective.filters }).catch(failure => toast({ body: authError(failure) }));
    revert();
  };
  const views: ListViews = { label: '보기 방식', value: effective.layout, options: [...VIEW_LAYOUTS], onChange: layout => adjust({ layout: layout as ViewLayout }) };
  const order: ListSort = { keys: VIEW_SORT_KEYS, key: effective.sort.key, direction: effective.sort.direction, usual: view.sort,
    onChange: (key, direction) => { setShown(SLICE); adjust({ sort: { key: key as ViewSort['key'], direction } }); } };
  const display: ListDisplay = {
    isChanged: effective.isTweaked,
    columns: effective.layout === 'list' ? { label: '표시할 속성', options: VIEW_COLUMNS.map(column => ({ value: column.value, label: column.label })), value: effective.columns,
      onChange: next => adjust({ columns: VIEW_COLUMNS.map(column => column.value).filter(column => next.includes(column)) as ViewColumn[] }) } : undefined,
    foot: tweak ? <>
      <Button label="초기화" variant="ghost" size="sm" onClick={() => { void setViewTweak(client, workspaceId, view.id, undefined); }} />
      {canEdit && <Button label={view.isPersonal ? '뷰에 저장' : '모두의 기본값으로 저장'} variant="secondary" size="sm"
        onClick={() => { void updateView(client, view, { layout: effective.layout, sort: effective.sort, columns: effective.columns })
          .then(() => setViewTweak(client, workspaceId, view.id, undefined)).catch(failure => toast({ body: authError(failure) })); }} />}
    </> : undefined,
  };
  const applied = effective.isFiltered ? <>
    <Button label="되돌리기" variant="ghost" size="sm" onClick={revert} />
    <Button label={canEdit ? '저장' : '뷰로 저장'} variant="secondary" size="sm" onClick={saveFilters} />
  </> : undefined;
  const create = onCreate && (() => onCreate());
  // A bar carried across the calendar moves the issue's start and due day together.
  const moveDays = async (item: WorkItem, by: number) => {
    try {
      await updateItem(workspaceId, item.projectId, item.id, { expectedVersion: item.version,
        ...(item.startDate ? { startDate: shiftDay(item.startDate, by) } : {}), ...(item.dueDate ? { dueDate: shiftDay(item.dueDate, by) } : {}) });
    } catch (failure) { toast({ body: authError(failure) }); }
    await refreshItems(client, workspaceId, item.projectId);
  };
  const isNarrowed = !!search.q || effective.isFiltered || Object.values(view.filters).some(Boolean);
  const visible = rows.slice(0, shown);
  const summary = <ListSummary shown={visible.length} total={rows.length} step={SLICE} hasMore={shown < rows.length} onMore={() => setShown(shown + SLICE)} />;
  const empty = (what: string, hint: string) => <PageState kind={isNarrowed ? 'search' : 'empty'} title={isNarrowed ? `조건에 맞는 ${what}이 없습니다` : `아직 ${what}이 없습니다`}
    description={isNarrowed ? '검색어나 필터를 바꿔 보세요.' : hint}
    actions={isNarrowed && (search.q || effective.isFiltered) ? <Button label="조건 지우기" variant="secondary" onClick={() => go({ q: undefined, ...Object.fromEntries(FILTER_KEYS.map(key => [key, undefined])) })} /> : undefined} />;
  const withStatus = rows.filter(row => row.columnId);
  return <>
    <ListToolbar search={{ label: '이슈 검색', placeholder: '제목이나 키로 찾기', value: search.q, onChange: q => { setShown(SLICE); go({ q }, true); } }}
      filters={filters} onFiltersChange={changeFilters} order={order} views={views} display={display} applied={applied}
      action={create && { label: '새 이슈', icon: 'plus', onClick: create, isCreate: true }} />
    {effective.layout === 'list' && (rows.length === 0 ? empty('이슈', '첫 이슈를 만들면 여기에 보입니다.') : isMobile
      ? <><IssueRows workspaceId={workspaceId} rows={visible} search={search} columns={effective.columns} columnNames={columnNames} />{summary}</>
      : <IssueTable workspaceId={workspaceId} rows={visible} search={search} columns={effective.columns} columnNames={columnNames} order={order} foot={summary} />)}
    {effective.layout === 'board' && (withStatus.length === 0 && !scope.project ? empty('상태가 있는 이슈', '이슈에 상태를 정하면 칸반의 칸에 놓입니다.')
      : <BoardView scope={scope} items={withStatus} search={search} onCreate={onCreate} />)}
    {effective.layout === 'calendar' && <div className={styles.calendarRoom}>
      <div className={styles.calendarBar}><CalendarBar day={search.date ?? currentDay()} onPlace={date => go({ date: date === currentDay() ? undefined : date })} /></div>
      <IssueCalendar workspaceId={workspaceId} items={rows} anchor={search.date ?? currentDay()} onOpen={href => openPage(href)}
        onMove={scope.canWrite ? (item, by) => { void moveDays(item, by); } : undefined} />
    </div>}
    {effective.layout === 'timeline' && <TimelineView workspaceId={workspaceId} items={rows} search={search} empty={empty('날짜가 있는 이슈', '시작일이나 기한을 정하면 여기에서 기간 막대로 보입니다.')} />}
    {effective.layout === 'cards' && <CardsView workspaceId={workspaceId} items={rows} search={search} empty={empty('이슈', '첫 이슈를 만들면 여기에 카드로 보입니다.')} />}
    {effective.layout === 'history' && <HistoryView workspaceId={workspaceId} items={rows} search={search} empty={empty('이슈', '이슈가 생기면 달마다 여기에 쌓입니다.')} />}
  </>;
}
