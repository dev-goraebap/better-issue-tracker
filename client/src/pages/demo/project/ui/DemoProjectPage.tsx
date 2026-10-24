import { useCallback, useEffect, useId, useState } from 'react';
import { Button, useToast } from '@astryxdesign/core';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { PageFrame, PageState, PageTabs, type PageTab } from '@/shared/ui';
import { PROJECT_TABS, projectOf, useProjects, useWorkItems, type ProjectTab, type Status, type WorkSearch } from '@/entities/demo-sample';
import type { Scope } from '../model/scope';
import { BacklogTab } from './BacklogTab';
import { CreateIssueDialog } from './CreateIssueDialog';
import { DecisionsTab } from './DecisionsTab';
import { NotesTab } from './NotesTab';
import { WorkTab } from './WorkTab';

const TABS: PageTab<ProjectTab>[] = PROJECT_TABS.map(tab => ({ value: tab.value, label: tab.label, icon: tab.icon }));

/**
 * PATTERN · 프로젝트, /demo/w/$workspaceId/p/$projectId, and 전체 at /demo/w/$workspaceId (the home, D-065). Copy this
 * page for one thing seen through tabs of different kinds.
 *
 * - The scope is the trail's switcher (전체 or a project); the home is 전체, the same page over every active project.
 * - The sidebar holds no menu under a project: its parts are PageTabs in the tab row (작업, 백로그, 노트, and 결정기록
 *   only for a project), the tab the URL's (작업 left out). Each tab brings its own toolbar, whose tools sit at the tab
 *   row's end.
 * - 작업 is seen as a list (a table on a desktop, cards on a phone), a calendar, a kanban or a timeline, picked in its
 *   표시 menu (a phone's 표시 sheet); 백로그 only as rows; 노트 as Keep-like cards; 결정기록 as a history down the page.
 * - Switching tabs starts the new tab afresh; within a tab, its view and conditions are the address's.
 * - 새 작업 (the toolbar's action, a board column's +, or the C key) opens the dialog over the page (CreateIssueDialog),
 *   in the project in view (in 전체, a project picked in it); what it makes shows at once, with a toast to open it.
 * - A project the address does not name is a not-found state, never a blank page.
 */
export function DemoProjectPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId?: string };
  const search = useSearch({ strict: false }) as WorkSearch;
  const navigate = useNavigate();
  const panelId = useId();
  const projects = useProjects(workspaceId).filter(each => each.status === 'active');
  const project = projectId ? projectOf(projectId) : undefined;
  useWorkItems();
  const toast = useToast();
  const [creating, setCreating] = useState<{ status?: Status } | null>(null);
  // C opens 새 작업, as Linear's, unless the member is typing or something is already open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'c' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if ((event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      setCreating({});
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const scope: Scope = { workspaceId, project, projectIds: project ? [project.id] : projects.map(each => each.id), firstProject: project ?? projects[0] };
  const tabs = project ? TABS : TABS.filter(each => each.value !== 'decisions');
  const tab: ProjectTab = tabs.some(each => each.value === search.tab) ? search.tab! : 'work';
  // The page in view (전체 or the project) with its address's conditions changed, or a tab's fresh start.
  const place = useCallback((next: (previous: WorkSearch) => WorkSearch, replace = false) => {
    if (projectId) void navigate({ to: '/demo/w/$workspaceId/p/$projectId', params: { workspaceId, projectId }, search: next(search), replace });
    else void navigate({ to: '/demo/w/$workspaceId', params: { workspaceId }, search: next(search), replace });
  }, [navigate, workspaceId, projectId, search]);
  const go = useCallback((patch: Partial<WorkSearch>, replace = false) => place(previous =>
    Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)), replace), [place]);
  if (projectId && !project) return <PageFrame title="프로젝트를 찾을 수 없습니다">
    <PageState kind="not-found" title="프로젝트를 찾을 수 없습니다" description="지워졌거나 이 워크스페이스의 프로젝트가 아닙니다." />
  </PageFrame>;
  return <PageFrame title={project?.name ?? '홈'} icon={project ? 'board' : 'home'} chrome="header"
    tabs={<PageTabs value={tab} items={tabs} panelId={panelId} onChange={next => place(() => (next === 'work' ? {} : { tab: next as WorkSearch['tab'] }))} />}>
    <div role="tabpanel" id={panelId}>
      {tab === 'work' && <WorkTab scope={scope} search={search} go={go} onCreate={status => setCreating({ status })} />}
      {tab === 'backlog' && <BacklogTab scope={scope} search={search} go={go} onCreate={() => setCreating({ status: 'todo' })} />}
      {tab === 'notes' && <NotesTab scope={scope} search={search} go={go} />}
      {tab === 'decisions' && project && <DecisionsTab workspaceId={workspaceId} project={project} search={search} go={go} />}
    </div>
    <CreateIssueDialog isOpen={!!creating} projects={projects} project={project} status={creating?.status} onClose={() => setCreating(null)}
      onCreated={item => toast({ body: `${item.key} ${item.title}을(를) 만들었습니다.`,
        // The toast lives in a layer above the router, so its way to the item navigates rather than linking.
        endContent: <Button label="보기" variant="ghost" size="sm" onClick={() => void navigate({ to: '/demo/w/$workspaceId/p/$projectId/work-items/$workItemId',
          params: { workspaceId, projectId: item.projectId, workItemId: item.id } })} /> })} />
  </PageFrame>;
}
