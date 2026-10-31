import { useCallback, useEffect, useEffectEvent, useMemo } from 'react';
import { useToast } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useRouterState, useSearch } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { isForOther } from '@/shared/lib/key-target';
import { PanelHostContext, useScreenPanel } from '@/shared/lib/routed-panel';
import { DefaultAvatar, ListToolbar, PageFrame, RequestBoundary, RoutedPanel, type ListFilter } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { canWrite, useMembers, workspaceQuery } from '@/entities/workspace';
import { filterWorkItems, refreshItems, updateItem, useScopeItems, type WorkItem, type WorkItemSearch } from '@/entities/work-item';
import { currentDay, shiftDay } from '../model/dates';
import { ScheduleCalendar } from './ScheduleCalendar';
import { NEW_PATH, WorkItemPanel } from './WorkItemPanel';

/** Schedules have one calendar, URL filters and no saved-view or display configuration. */
export function SchedulesPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId?: string };
  const fullSearch = useSearch({ strict: false }) as WorkItemSearch;
  const search = useMemo(() => ({ q: fullSearch.q, date: fullSearch.date, assignee: fullSearch.assignee, label: fullSearch.label }), [fullSearch]);
  const pathname = useRouterState({ select: state => state.location.pathname });
  const { host, depth } = useScreenPanel(pathname, fullSearch, search);
  const navigate = useNavigate(); const client = useQueryClient(); const toast = useToast();
  const workspace = useQuery(workspaceQuery(workspaceId)).data;
  const writable = canWrite(workspace);
  const result = useScopeItems(workspaceId, projectId);
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const members = useMembers(workspaceId).items;
  const go = useCallback((patch: Partial<typeof search>, replace = false) => {
    const query = new URLSearchParams(Object.fromEntries(Object.entries({ ...search, ...patch }).filter(([, value]) => value !== undefined)) as Record<string, string>);
    void navigate({ href: `${pathname}${query.size ? `?${query}` : ''}`, replace });
  }, [navigate, pathname, search]);
  const openNew = () => { if (writable) host.open(`/workspaces/${workspaceId}${projectId ? `/projects/${projectId}` : ''}/work-items/new?kind=event`); };
  const onKey = useEffectEvent((event: KeyboardEvent) => { if (event.key.toLowerCase() === 'c' && !isForOther(event)) { event.preventDefault(); openNew(); } });
  useEffect(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  const rows = useMemo(() => filterWorkItems(result.items.filter(item => item.kind === 'event'), { assignee: search.assignee, label: search.label }, { key: 'title', direction: 'asc' }, search.q), [result.items, search]);
  const filters: ListFilter[] = [
    { key: 'assignee', label: '참석자', icon: 'members', value: search.assignee, isMultiple: true, isSearchable: true, options: members.map(member => ({ value: member.userId, label: member.name, icon: <DefaultAvatar seed={member.userId} name={member.name} size={20} /> })) },
    { key: 'label', label: '라벨', icon: 'label', value: search.label, isMultiple: true, isSearchable: true, options: labels.map(label => ({ value: label.id, label: label.name })) },
  ];
  const move = async (item: WorkItem, days: number) => {
    const later = (time: string) => new Date(Date.parse(time) + days * 86_400_000).toISOString();
    try {
      await updateItem(workspaceId, item.projectId ?? '', item.id, { expectedVersion: item.version,
        ...(item.startDate ? { startDate: shiftDay(item.startDate, days) } : {}), ...(item.dueDate ? { dueDate: shiftDay(item.dueDate, days) } : {}),
        ...(item.startsAt ? { startsAt: later(item.startsAt) } : {}), ...(item.endsAt ? { endsAt: later(item.endsAt) } : {}) });
    } catch (failure) { toast({ body: authError(failure) }); }
    await refreshItems(client, workspaceId, item.projectId ?? '');
  };
  const panelPath = fullSearch.panel?.split('?')[0] ?? '';
  return <PanelHostContext.Provider value={host}><PageFrame title="스케줄" icon="calendar" chrome="header">
    <ListToolbar search={{ label: '일정 검색', placeholder: '제목이나 키로 찾기', value: search.q, onChange: q => go({ q }, true) }} filters={filters}
      onFiltersChange={values => go({ ...('assignee' in values ? { assignee: values.assignee } : {}), ...('label' in values ? { label: values.label } : {}) })}
      action={writable ? { label: '스케줄 만들기', icon: 'plus', isCreate: true, onClick: openNew } : undefined} />
    <RequestBoundary pending={result.isLoading} hasData={!result.isMissing} error={result.error} retry={() => void result.refetch()}>
      <ScheduleCalendar workspaceId={workspaceId} items={rows} day={search.date ?? currentDay()} onPlace={date => go({ date: date === currentDay() ? undefined : date })}
        onOpen={href => host.open(href)} onMove={writable ? (item, days) => void move(item, days) : undefined} />
    </RequestBoundary>
    {fullSearch.panel && <RoutedPanel label={NEW_PATH.test(panelPath) ? '새 일정' : '일정'} href={fullSearch.panel} depth={depth} host={host}
      size={NEW_PATH.test(panelPath) ? 'form' : 'content'} place={NEW_PATH.test(panelPath) ? 'modal' : 'peek'}><WorkItemPanel href={fullSearch.panel} /></RoutedPanel>}
  </PageFrame></PanelHostContext.Provider>;
}
