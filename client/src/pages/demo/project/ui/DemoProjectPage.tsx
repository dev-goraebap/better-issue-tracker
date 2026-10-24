import { useCallback, useId } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { PageFrame, PageState, PageTabs, type PageTab } from '@/shared/ui';
import { PROJECT_TABS, projectOf, type ProjectTab, type WorkSearch } from '@/entities/demo-sample';
import { BacklogTab } from './BacklogTab';
import { DecisionsTab } from './DecisionsTab';
import { NotesTab } from './NotesTab';
import { WorkTab } from './WorkTab';

const TABS: PageTab<ProjectTab>[] = PROJECT_TABS.map(tab => ({ value: tab.value, label: tab.label, icon: tab.icon }));

/**
 * PATTERN · 프로젝트, /demo/w/$workspaceId/p/$projectId (D-064). Copy this page for one thing seen through tabs of
 * different kinds.
 *
 * - The sidebar holds no menu under a project: its parts are PageTabs in the tab row (작업, 백로그, 노트, 결정기록),
 *   the tab the URL's (작업 left out). Each tab brings its own toolbar, whose tools sit at the tab row's end.
 * - 작업 is seen as a list (a table on a desktop, cards on a phone), a calendar, a kanban or a timeline (its view
 *   switch leads the toolbar); 백로그 only as rows; 노트 as Keep-like cards; 결정기록 as a history down the page.
 * - Switching tabs starts the new tab afresh; within a tab, its view and conditions are the address's.
 * - A project the address does not name is a not-found state, never a blank page.
 */
export function DemoProjectPage() {
  const { workspaceId, projectId } = useParams({ from: '/demo/w/$workspaceId/p/$projectId' });
  const search = useSearch({ from: '/demo/w/$workspaceId/p/$projectId' });
  const navigate = useNavigate();
  const panelId = useId();
  const project = projectOf(projectId);
  const tab: ProjectTab = search.tab ?? 'work';
  const go = useCallback((patch: Partial<WorkSearch>, replace = false) => void navigate({
    to: '/demo/w/$workspaceId/p/$projectId', params: { workspaceId, projectId }, replace,
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId, projectId]);
  if (!project) return <PageFrame title="프로젝트를 찾을 수 없습니다">
    <PageState kind="not-found" title="프로젝트를 찾을 수 없습니다" description="지워졌거나 이 워크스페이스의 프로젝트가 아닙니다." />
  </PageFrame>;
  return <PageFrame title={project.name} icon="board" chrome="header"
    tabs={<PageTabs value={tab} items={TABS} panelId={panelId}
      onChange={next => void navigate({ to: '/demo/w/$workspaceId/p/$projectId', params: { workspaceId, projectId }, search: next === 'work' ? {} : { tab: next as WorkSearch['tab'] } })} />}>
    <div role="tabpanel" id={panelId}>
      {tab === 'work' && <WorkTab workspaceId={workspaceId} project={project} search={search} go={go} />}
      {tab === 'backlog' && <BacklogTab workspaceId={workspaceId} project={project} search={search} go={go} />}
      {tab === 'notes' && <NotesTab project={project} search={search} go={go} />}
      {tab === 'decisions' && <DecisionsTab workspaceId={workspaceId} project={project} search={search} go={go} />}
    </div>
  </PageFrame>;
}
