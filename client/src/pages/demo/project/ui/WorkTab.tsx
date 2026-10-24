import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useNavigate } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { DefaultAvatar, ListToolbar, NavIcon, valuesOf, type ListFilter } from '@/shared/ui';
import { PEOPLE, WORK_ITEMS, type Project, type TableSearch, type WorkSearch, type WorkView } from '@/entities/demo-sample';
import type { DemoCalendarSearch } from '../model/month';
import { BoardView } from './BoardView';
import { DemoCalendar } from './DemoCalendar';
import { DemoCalendarBar } from './DemoCalendarBar';
import { TimelineView } from './TimelineView';
import { WorkList } from './WorkList';
import styles from './project.module.css';

/** What the 작업 calendar shows: the project's work with a due day and its schedules. */
const CALENDAR_KINDS = ['work', 'team'] as const;
const VIEWS: readonly { value: WorkView; label: string; icon: string }[] = [
  { value: 'list', label: '리스트', icon: 'list' }, { value: 'calendar', label: '캘린더', icon: 'calendar' },
  { value: 'board', label: '칸반', icon: 'board' }, { value: 'timeline', label: '타임라인', icon: 'milestone' },
];

/**
 * The 작업 tab: the project's work in the view the address names (D-064). 리스트 is the list (WorkList: a sortable table
 * on a desktop, cards on a phone; there is no separate table view); 캘린더 puts work with a due day and the project's
 * schedules on SandboxHr's calendar; 칸반 is a column per status across the card's width; 타임라인 lays dated work
 * along the days. The view switch leads the toolbar on a desktop and heads the content on a phone.
 */
export function WorkTab({ workspaceId, project, search, go }: {
  workspaceId: string; project: Project; search: WorkSearch; go: (patch: Partial<WorkSearch>, replace?: boolean) => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const navigate = useNavigate();
  const view: WorkView = search.view ?? 'list';
  const items = WORK_ITEMS.filter(item => item.projectId === project.id);
  const create = () => void navigate({ to: '/demo/w/$workspaceId/p/$projectId/work-items/new', params: { workspaceId, projectId: project.id } });
  const switcher = <SegmentedControl label="작업 보기" size="sm" value={view} onChange={next => go({ view: next === 'list' ? undefined : next as WorkSearch['view'] })}>
    {VIEWS.map(each => <SegmentedControlItem key={each.value} value={each.value} label={each.label} icon={<NavIcon name={each.icon} />} />)}
  </SegmentedControl>;
  const chosen = valuesOf(search.assignee);
  const assigned = items.filter(item => chosen.length === 0 || (item.assigneeId !== undefined && chosen.includes(item.assigneeId)));
  const assigneeFilter: ListFilter = { key: 'assignee', label: '담당자', icon: 'person', value: search.assignee, isMultiple: true, isSearchable: true,
    options: PEOPLE.map(person => ({ value: person.id, label: person.name, icon: <DefaultAvatar seed={person.id} name={person.name} size={20} /> })) };
  const action = { label: '새 작업', icon: 'plus', onClick: create, isCreate: true };
  // The calendar keeps its own place in the address (cal, date), apart from 작업's view.
  const calendarSearch: DemoCalendarSearch = { view: search.cal, date: search.date };
  const placeCalendar = (next: DemoCalendarSearch) => go({ cal: next.view === 'month' ? undefined : next.view, date: next.date });
  return <>
    {isMobile && <div className={styles.viewRow}>{switcher}</div>}
    {view === 'list'
      ? <WorkList workspaceId={workspaceId} items={items} search={search} lead={switcher}
        onChange={(patch: Partial<TableSearch>, replace) => go(patch, replace)} onCreate={create} />
      : <ListToolbar label="작업 조건" lead={switcher} filters={view === 'calendar' ? [] : [assigneeFilter]} onFiltersChange={values => go({ assignee: values.assignee })} action={action} />}
    {view === 'calendar' && <div className={styles.calendarRoom}>
      <div className={styles.calendarBar}><DemoCalendarBar search={calendarSearch} onPlace={placeCalendar} /></div>
      <DemoCalendar workspaceId={workspaceId} project={project.id} kinds={CALENDAR_KINDS} search={calendarSearch} onPlace={placeCalendar} onOpen={href => void navigate({ href })} />
    </div>}
    {view === 'board' && <BoardView workspaceId={workspaceId} items={assigned} search={search} onCreate={create} />}
    {view === 'timeline' && <TimelineView workspaceId={workspaceId} items={assigned} search={search} />}
  </>;
}
