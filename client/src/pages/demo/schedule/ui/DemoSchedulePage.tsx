import { useState } from 'react';
import { Button, ToggleButton, useToast } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { ListToolbar, NavIcon, PageFrame, PageState, type ListFilter } from '@/shared/ui';
import { clearWorkDue, PRIORITY_RANK, projectsIn, setWorkDue, useWorkDues, WORK_ITEMS, type ScopeSearch } from '@/entities/demo-sample';
import { DEMO_TODAY, DemoCalendar, DemoCalendarBar, type DemoCalendarSearch } from '@/widgets/demo-calendar';
import { CreateMenu } from './CreateMenu';
import { CreateSheet } from './CreateSheet';
import { ScheduleDialog } from './ScheduleDialog';
import { UndatedWork } from './UndatedWork';
import styles from './schedule.module.css';

/**
 * PATTERN · 일정 (이슈 메뉴, calendar), /demo/w/$workspaceId/schedule (D-063). Copy this page for a screen whose content
 * is one calendar.
 *
 * - PageFrame chrome="header" with the calendar's own controls (오늘, the period's steps, its title, the … view menu)
 *   in the tab row instead of tabs, and the page's one action at the header row's end; the calendar fills the card
 *   under them, as SandboxHr's team calendar does. Its view, day and scope are the address's view, date and project.
 * - The calendar shows the workspace's schedules and the work with a due day, or one project's when the scope names it
 *   (the sidebar's 프로젝트 list and the 프로젝트 filter set the same value).
 * - The action is 만들기, a menu of what can be made from here (a desktop's dropdown, a phone's floating + and sheet):
 *   a schedule of the workspace, in a dialog, tied to a project or to none; or a work item, on its project's form.
 * - Work with no due day (날짜 미정) cannot sit on a day, so it waits beside the calendar: a desktop's drawer, open
 *   while there is any and closed when there is none (its toggle at the tab row's end changes that for the visit),
 *   each row carried onto a day to give it that day (a toast says where it went, as a full day hides it under +N개 더,
 *   and takes it back); a phone's sheet behind the same toggle in the calendar's bar.
 */
export function DemoSchedulePage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/schedule' });
  const search = useSearch({ from: '/demo/w/$workspaceId/schedule' });
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [isChoosing, setChoosing] = useState(false);
  const [isScheduling, setScheduling] = useState(false);
  const [undatedChoice, setUndatedChoice] = useState<boolean | null>(null);
  const dues = useWorkDues();
  const projects = projectsIn(workspaceId).filter(project => project.status === 'active');
  const scope = projects.find(project => project.id === search.project);
  const undated = WORK_ITEMS.filter(item => projects.some(project => project.id === item.projectId) && (!scope || item.projectId === scope.id)
    && item.status !== 'done' && !item.dueAt && !dues[item.id])
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  // A phone's sheet opens only when asked; a desktop's drawer stands open while there is anything in it, unless toggled.
  const isUndatedOpen = isMobile ? undatedChoice === true : undatedChoice ?? undated.length > 0;
  // A phone's bar has room for the month's name only beside a shorter toggle.
  const undatedToggle = <ToggleButton label={isMobile ? `미정 ${undated.length}` : `날짜 미정 ${undated.length}`} size="sm"
    icon={isMobile ? undefined : <NavIcon name="list" />} isPressed={isUndatedOpen} onPressedChange={setUndatedChoice} />;
  const place = (next: DemoCalendarSearch & ScopeSearch) => void navigate({ to: '/demo/w/$workspaceId/schedule', params: { workspaceId },
    search: Object.fromEntries(Object.entries({ project: search.project, ...next }).filter(([, value]) => value !== undefined)) });
  const schedule = () => { setChoosing(false); setScheduling(true); };
  const giveDay = (itemId: string, day: string) => {
    const item = WORK_ITEMS.find(candidate => candidate.id === itemId);
    if (!item) return;
    setWorkDue(itemId, day);
    const dismiss = toast({ body: `${item.key} 마감일을 ${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일로 정했습니다.`,
      endContent: <Button label="되돌리기" variant="ghost" size="sm" onClick={() => { clearWorkDue(itemId); dismiss(); }} /> });
  };
  const work = (projectId: string) => void navigate({ to: '/demo/w/$workspaceId/p/$projectId/work-items/new', params: { workspaceId, projectId } });
  const projectFilter: ListFilter = { key: 'project', label: '프로젝트', icon: 'board', value: search.project,
    options: projects.map(project => ({ value: project.id, label: project.name })) };
  const scopeTo = (project?: string) => place({ view: search.view, date: search.date, project });
  // A workspace just made has nothing yet: it says what to do first rather than showing an empty calendar.
  if (!projects.length) return <PageFrame title="일정" icon="calendar">
    <PageState title="첫 프로젝트를 만들어 보세요" description="작업·결정기록·노트는 프로젝트 안에 모입니다. 프로젝트를 만들고 멤버를 초대하면 여기에 일정이 보입니다."
      actions={<Button label="프로젝트 만들기" variant="primary" onClick={() => void navigate({ to: '/demo/w/$workspaceId/projects', params: { workspaceId } })} />} />
  </PageFrame>;
  return <PageFrame title={scope ? `${scope.name} · 일정` : '일정'} icon="calendar" chrome="header"
    tabs={<DemoCalendarBar search={search} onPlace={next => place(next)} end={isMobile ? undatedToggle : undefined} />}
    actions={isMobile ? undefined : <CreateMenu projects={projects} onSchedule={schedule} onWork={work} />}>
    {isMobile
      ? <ListToolbar label="일정 조건" filters={[projectFilter]} onFiltersChange={values => scopeTo(values.project)}
        action={{ label: '만들기', icon: 'plus', isCreate: true, onClick: () => setChoosing(true) }} />
      : <ListToolbar label="일정 조건" filters={[projectFilter]} onFiltersChange={values => scopeTo(values.project)} end={undatedToggle} />}
    <div className={styles.home}>
      <DemoCalendar workspaceId={workspaceId} project={scope?.id} search={search} onPlace={place} onOpen={href => void navigate({ href })} onDropWork={giveDay} />
      <UndatedWork items={undated} workspaceId={workspaceId} isMobile={isMobile} isOpen={isUndatedOpen} onClose={() => setUndatedChoice(false)}
        onOpen={href => void navigate({ href })} />
    </div>
    <CreateSheet isOpen={isChoosing} projects={projects} onSchedule={schedule} onWork={work} onClose={() => setChoosing(false)} />
    <ScheduleDialog key={`${search.date ?? DEMO_TODAY}-${scope?.id ?? ''}`} isOpen={isScheduling} workspaceId={workspaceId} projects={projects} project={scope?.id}
      day={search.date ?? DEMO_TODAY} onClose={() => setScheduling(false)} onCreated={date => { setScheduling(false); place({ ...search, date }); }} />
  </PageFrame>;
}
