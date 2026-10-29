import { useMemo, useState } from 'react';
import { Button, useToast } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { MOBILE_QUERY } from '@/shared/config';
import { authError, capabilitiesQueryOptions } from '@/shared/api';
import { subject } from '@/shared/lib/korean-particle';
import { useGo } from '@/shared/lib/routed-panel';
import { DefaultAvatar, ListSummary, ListToolbar, PageState, useFillRoom, type ListDisplay, type ListFilter, type ListSort, type ListViews } from '@/shared/ui';
import type { Label } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import type { Member } from '@/entities/workspace';
import { PullBadge, pullBadgesQuery } from '@/entities/repository';
import { TypeMark, workItemTypesQuery } from '@/entities/work-item-type';
import {
  CATEGORIES, CATEGORY_LABELS, FILTER_KEYS, filterWorkItems, GROUPINGS, groupWorkItems, limitGroups, NO_FILTER, PRIORITIES, refreshItems, setViewTweak, statusSteps, subtaskProgress, SYSTEM_LABEL,
  updateItem, updateView, VIEW_COLUMNS, VIEW_LAYOUTS, VIEW_SORT_KEYS, WorkItemList, type effectiveView, type Grouping, type WorkItemSearch, type WorkItemView, type ViewColumn,
  type StatusStep, type ViewLayout, type ViewSort, type ViewTweak, type WorkItem,
} from '@/entities/work-item';
import { currentDay, shiftDay } from '../model/dates';
import type { Scope } from '../model/scope';
import { BoardView } from './BoardView';
import { CalendarBar } from './CalendarBar';
import { CardsView } from './CardsView';
import { HistoryView } from './HistoryView';
import { WorkItemCalendar } from './WorkItemCalendar';
import { TimelineView } from './TimelineView';
import styles from './views.module.css';

const SLICE = 50;
const same = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * PATTERN · 뷰 (D-066, D-068). The work items of the scope (전체 or a project) as the view in sight shows them: its filters
 * (and those the address changed over them), in its layout, order and columns, or the member's own adjustments to them.
 *
 * - The toolbar's 필터 narrows by status (its category, or 상태 없음), priority, assignee, label and type (D-104); a filter
 *   changed from the view's own puts 되돌리기 and 저장 at the filters row's end. A view stores no type, so the type
 *   filter stays the address's: 저장 keeps it there and 되돌리기 takes it off. 저장 writes the filters into the view when the
 *   member may change it, and otherwise (전체 업무, a view of someone else's) makes a new view from them (onSaveAsView).
 * - 표시 picks the layout, the order, the grouping and the columns shown; they stay the member's own (setViewTweak) until 초기화 drops
 *   them or '모두의 기본값으로 저장' writes them into the view for everyone.
 * - 리스트 shows every work item as Linear's rows (D-106), gathered by the view's grouping with subtasks in under their
 *   parents (a phone's rows as small cards), 칸반 those with a status, 캘린더 and 타임라인
 *   those with a day, 카드 every work item as Keep's cards, 히스토리 every work item down a timeline by month.
 */
export function WorkItemsView({ scope, view, tweak, effective, workItems, labels, members, search, go, onCreate, onSaveAsView }: {
  scope: Scope; view: WorkItemView; tweak?: ViewTweak; effective: ReturnType<typeof effectiveView>; workItems: readonly WorkItem[];
  labels: readonly Label[]; members: readonly Member[]; search: WorkItemSearch; go: (patch: Partial<WorkItemSearch>, replace?: boolean) => void;
  onCreate?: (status?: string, kind?: 'event') => void; onSaveAsView: () => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const client = useQueryClient();
  const toast = useToast();
  // A work item opened from the calendar goes where a pressed link would: into the page's modal (D-069).
  const openPage = useGo();
  const [shown, setShown] = useState(SLICE);
  // Folded groups, as grouping|key, so another grouping starts unfolded and coming back finds them as they were.
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  // The calendar shares out the height the page leaves below the toolbar, to the card's foot.
  const calendarRoom = useFillRoom<HTMLDivElement>(effective.layout === 'calendar');
  const { workspaceId } = scope;
  const canEdit = view.canEdit;
  const rows = useMemo(() => filterWorkItems(workItems, effective.filters, effective.sort, search.q, effective.types), [workItems, effective.filters, effective.sort, search.q, effective.types]);
  // The pull requests of the work items on screen, for their badges, when the server keeps repository integrations (D-087).
  const hasRepositories = useQuery(capabilitiesQueryOptions).data?.gitIntegration ?? false;
  const badgeIds = rows.slice(0, 500).map(row => row.id);
  const badgeProjects = [...new Set(rows.slice(0, 500).map(row => row.projectId).filter((id): id is string => !!id))];
  const pulls = useQuery({ ...pullBadgesQuery(workspaceId, badgeProjects, badgeIds), enabled: hasRepositories && badgeIds.length > 0 }).data;
  const badges = useMemo(() => {
    const byWorkItem = new Map<string, NonNullable<typeof pulls>>();
    for (const pull of pulls ?? []) byWorkItem.set(pull.workItemId, [...(byWorkItem.get(pull.workItemId) ?? []), pull]);
    return new Map([...byWorkItem].map(([id, list]) => [id, <PullBadge key={id} pulls={list} />]));
  }, [pulls]);
  // A row names its status by its column (검토 중), in 전체 too: there every project's columns are read.
  const allColumns = useQueries({ queries: scope.project ? [] : scope.projects.map(project => columnsQuery(scope.workspaceId, project.id)) });
  // Kept as one string so the map changes only when a column does (the query results are new arrays each render).
  const columnList = JSON.stringify([...scope.columns, ...allColumns.flatMap(result => result.data ?? [])].map(column => [column.id, column.name]));
  const columnNames = useMemo(() => new Map(JSON.parse(columnList) as [string, string][]), [columnList]);
  // Each column's step within its project's category, so a second 진행 중 or 취소 column draws apart (D-111).
  const stepList = JSON.stringify([scope.columns, ...allColumns.map(result => result.data ?? [])].flatMap(columns => [...statusSteps(columns)]));
  const columnSteps = useMemo(() => new Map(JSON.parse(stepList) as [string, StatusStep][]), [stepList]);
  // The workspace's types, for the 유형 filter (D-104).
  const types = useQuery(workItemTypesQuery(workspaceId)).data ?? [];
  // A member's adjustment that comes back to the view's own is no adjustment.
  const adjust = (patch: ViewTweak) => {
    const next = { ...tweak, ...patch };
    void setViewTweak(client, workspaceId, view.id, {
      layout: next.layout && next.layout !== view.layout ? next.layout : undefined,
      sort: next.sort && !same(next.sort, view.sort) ? next.sort : undefined,
      columns: next.columns && !same(next.columns, view.columns) ? next.columns : undefined,
      grouping: next.grouping && next.grouping !== (view.grouping ?? 'none') ? next.grouping : undefined,
    });
  };
  const filters: ListFilter[] = [
    { key: 'status', label: '상태', icon: 'status', value: effective.filters.status, isMultiple: true, options: CATEGORIES.map(value => ({ value, label: CATEGORY_LABELS[value] })) },
    { key: 'priority', label: '우선순위', icon: 'priority', value: effective.filters.priority, options: Object.entries(PRIORITIES).map(([value, label]) => ({ value, label })) },
    { key: 'assignee', label: '사람', icon: 'person', value: effective.filters.assignee, isMultiple: true, isSearchable: true,
      options: members.map(member => ({ value: member.userId, label: member.name, icon: <DefaultAvatar seed={member.userId} name={member.name} size={20} /> })) },
    { key: 'label', label: '라벨', icon: 'label', value: effective.filters.label, isMultiple: true, isSearchable: true,
      options: labels.map(label => ({ value: label.system ? SYSTEM_LABEL : label.id, label: label.name, icon: <span className={styles.labelDot} style={{ background: label.color }} /> })) },
    { key: 'type', label: '유형', icon: 'tasks', value: effective.types, isMultiple: true, options: types.map(type => ({ value: type.id, label: type.name, icon: <TypeMark type={type} /> })) },
  ];
  // The address keeps only a filter that differs from the view's own ('-' for one taken off).
  const changeFilters = (values: Record<string, string | undefined>) => {
    setShown(SLICE);
    const patch: Partial<WorkItemSearch> = {};
    for (const key of FILTER_KEYS) {
      if (!(key in values)) continue;
      const value = values[key];
      patch[key] = ((value ?? '') === (view.filters[key] ?? '') ? undefined : value ?? NO_FILTER) as never;
    }
    if ('type' in values) patch.type = values.type || undefined;
    go(patch);
  };
  const viewOwn = Object.fromEntries(FILTER_KEYS.map(key => [key, undefined]));
  const revert = () => go({ ...viewOwn, type: undefined });
  const saveFilters = () => {
    if (!canEdit) { onSaveAsView(); return; }
    void updateView(client, view, { filters: effective.filters }).catch(failure => toast({ body: authError(failure) }));
    go(viewOwn);
  };
  const views: ListViews = { label: '보기 방식', value: effective.layout, options: [...VIEW_LAYOUTS], onChange: layout => adjust({ layout: layout as ViewLayout }) };
  const order: ListSort = { keys: VIEW_SORT_KEYS, key: effective.sort.key, direction: effective.sort.direction, usual: view.sort,
    onChange: (key, direction) => { setShown(SLICE); adjust({ sort: { key: key as ViewSort['key'], direction } }); } };
  const display: ListDisplay = {
    isChanged: effective.isTweaked,
    grouping: effective.layout === 'list' ? { label: '그룹', options: GROUPINGS.filter(option => option.value !== 'project' || !scope.project).map(option => ({ ...option })),
      value: effective.grouping, onChange: grouping => { setShown(SLICE); adjust({ grouping: grouping as Grouping }); } } : undefined,
    columns: effective.layout === 'list' ? { label: '표시할 속성', options: VIEW_COLUMNS.map(column => ({ value: column.value, label: column.label })), value: effective.columns,
      onChange: next => adjust({ columns: VIEW_COLUMNS.map(column => column.value).filter(column => next.includes(column)) as ViewColumn[] }) } : undefined,
    foot: tweak ? <>
      <Button label="초기화" variant="ghost" size="sm" onClick={() => { void setViewTweak(client, workspaceId, view.id, undefined); }} />
      {canEdit && <Button label={view.isPersonal ? '뷰에 저장' : '모두의 기본값으로 저장'} variant="secondary" size="sm"
        onClick={() => { void updateView(client, view, { layout: effective.layout, sort: effective.sort, columns: effective.columns, grouping: effective.grouping })
          .then(() => setViewTweak(client, workspaceId, view.id, undefined)).catch(failure => toast({ body: authError(failure) })); }} />}
    </> : undefined,
  };
  const applied = effective.isFiltered || effective.types ? <>
    <Button label="되돌리기" variant="ghost" size="sm" onClick={revert} />
    {effective.isFiltered && <Button label={canEdit ? '저장' : '뷰로 저장'} variant="secondary" size="sm" onClick={saveFilters} />}
  </> : undefined;
  const create = onCreate && (() => onCreate());
  // A bar carried across the calendar moves the work item's start and due day together; a timed event its times.
  const moveDays = async (item: WorkItem, by: number) => {
    const later = (moment: string) => new Date(Date.parse(moment) + by * 86_400_000).toISOString();
    try {
      await updateItem(workspaceId, item.projectId ?? '', item.id, { expectedVersion: item.version,
        ...(item.startDate ? { startDate: shiftDay(item.startDate, by) } : {}), ...(item.dueDate ? { dueDate: shiftDay(item.dueDate, by) } : {}),
        ...(item.startsAt ? { startsAt: later(item.startsAt) } : {}), ...(item.endsAt ? { endsAt: later(item.endsAt) } : {}) });
    } catch (failure) { toast({ body: authError(failure) }); }
    await refreshItems(client, workspaceId, item.projectId ?? '');
  };
  const isNarrowed = !!search.q || effective.isFiltered || !!effective.types || Object.values(view.filters).some(Boolean);
  // 리스트's rows gathered by the view's grouping (D-106); a project's statuses group by its columns, the home's by category.
  const groups = useMemo(() => effective.layout !== 'list' ? [] : groupWorkItems(rows, effective.grouping, {
    all: workItems, columns: scope.project ? scope.columns : undefined, types, labels, projects: scope.project ? undefined : scope.projects,
  }), [effective.layout, rows, effective.grouping, workItems, scope.project, scope.columns, scope.projects, types, labels]);
  const progress = useMemo(() => subtaskProgress(workItems), [workItems]);
  const collapsed = useMemo(() => new Set([...folded].filter(each => each.startsWith(`${effective.grouping}|`)).map(each => each.slice(effective.grouping.length + 1))),
    [folded, effective.grouping]);
  const toggleGroup = (key: string) => setFolded(previous => {
    const next = new Set(previous);
    const entry = `${effective.grouping}|${key}`;
    if (!next.delete(entry)) next.add(entry);
    return next;
  });
  const limited = limitGroups(groups, shown, collapsed);
  const summary = <ListSummary shown={limited.shown} total={rows.length} step={SLICE} hasMore={limited.hasMore} onMore={() => setShown(shown + SLICE)} />;
  const empty = (what: string, hint: string) => <PageState kind={isNarrowed ? 'search' : 'empty'} title={isNarrowed ? `조건에 맞는 ${subject(what)} 없습니다` : `아직 ${subject(what)} 없습니다`}
    description={isNarrowed ? '검색어나 필터를 바꿔 보세요.' : hint}
    actions={isNarrowed && (search.q || effective.isFiltered || effective.types) ? <Button label="조건 지우기" variant="secondary" onClick={() => go({ q: undefined, ...viewOwn, type: undefined })} /> : undefined} />;
  const withStatus = rows.filter(row => row.columnCategory);
  return <>
    <ListToolbar search={{ label: '업무 검색', placeholder: '제목이나 키로 찾기', value: search.q, onChange: q => { setShown(SLICE); go({ q }, true); } }}
      filters={filters} onFiltersChange={changeFilters} order={order} views={views} display={display} applied={applied}
      action={create && { label: '만들기', icon: 'plus', onClick: create, isCreate: true, choices: onCreate && [
        // 작업 or 일정 (D-092, BIT-111): a task's type is chosen in its own form, which starts at the workspace's default type.
        { label: '작업', icon: 'board', onClick: () => onCreate() },
        { label: '일정', icon: 'calendar', onClick: () => onCreate(undefined, 'event') },
      ] }} />
    {effective.layout === 'list' && (rows.length === 0 ? empty('업무', '첫 업무를 만들면 여기에 보입니다.') : <>
      <WorkItemList workspaceId={workspaceId} groups={limited.groups} search={search} columns={effective.columns} columnNames={columnNames} columnSteps={columnSteps} badges={badges}
        progress={progress} isPhone={isMobile} collapsed={collapsed} onToggle={toggleGroup} />
      {summary}
    </>)}
    {effective.layout === 'board' && (withStatus.length === 0 && !scope.project ? empty('작업', '작업을 만들면 상태에 따라 칸반의 칸에 놓입니다.')
      : <BoardView scope={scope} items={withStatus} search={search} onCreate={onCreate} badges={badges} />)}
    {effective.layout === 'calendar' && <div ref={calendarRoom} className={styles.calendarRoom}>
      <div className={styles.calendarBar}><CalendarBar day={search.date ?? currentDay()} onPlace={date => go({ date: date === currentDay() ? undefined : date })} /></div>
      <WorkItemCalendar workspaceId={workspaceId} items={rows} anchor={search.date ?? currentDay()} onOpen={href => openPage(href)}
        onMove={scope.canWrite ? (item, by) => { void moveDays(item, by); } : undefined} />
    </div>}
    {effective.layout === 'timeline' && <TimelineView workspaceId={workspaceId} items={rows} search={search} empty={empty('날짜가 있는 업무', '시작일이나 기한을 정하면 여기에서 기간 막대로 보입니다.')} />}
    {effective.layout === 'cards' && <CardsView workspaceId={workspaceId} items={rows} search={search} empty={empty('업무', '첫 업무를 만들면 여기에 카드로 보입니다.')} />}
    {effective.layout === 'history' && <HistoryView workspaceId={workspaceId} items={rows} search={search} empty={empty('업무', '업무가 생기면 달마다 여기에 쌓입니다.')} />}
  </>;
}
