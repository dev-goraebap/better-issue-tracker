import { useCallback, useId, useMemo } from 'react';
import { Button } from '@astryxdesign/core';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { DefaultAvatar, ListToolbar, PageFrame, PageState, PageTabs, valuesOf, type ListFilter, type PageTab } from '@/shared/ui';
import { PEOPLE, projectsIn, WORK_ITEMS, type TableSearch, type WorkSearch, type WorkView } from '@/entities/demo-sample';
import { BoardView } from './BoardView';
import { ListView } from './ListView';
import { WorkList } from './WorkList';

const VIEWS: PageTab<WorkView>[] = [
  { value: 'board', label: '칸반', icon: 'board' }, { value: 'list', label: '목록', icon: 'rows' },
  { value: 'table', label: '표', icon: 'table' }, { value: 'gantt', label: '간트', icon: 'calendar' },
];

/**
 * PATTERN · 작업 (이슈 메뉴), /demo/w/$workspaceId/work (D-063). Copy this page for an issue menu seen through views.
 *
 * - The workspace's work, or one project's when the address names it (`?project=`): the sidebar's 프로젝트 list and the
 *   toolbar's 프로젝트 filter set the same value, so a chip shows the scope and its × goes back to 전체.
 * - The views are PageTabs in the tab row (the URL's view, 칸반 left out); switching keeps the scope and conditions.
 *   칸반 takes the card's whole width; 목록 is rows read by title; 표 is the sortable table (WorkList); 간트 is not built
 *   yet and says so.
 * - 새 작업 opens the scoped project's form, or the first project's when the scope is the whole workspace.
 */
export function DemoWorkPage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/work' });
  const search = useSearch({ from: '/demo/w/$workspaceId/work' });
  const navigate = useNavigate();
  const panelId = useId();
  const projects = useMemo(() => projectsIn(workspaceId).filter(project => project.status === 'active'), [workspaceId]);
  const scope = projects.find(project => project.id === search.project);
  const view: WorkView = search.view ?? 'board';
  const go = useCallback((patch: Partial<WorkSearch>, replace = false) => void navigate({
    to: '/demo/w/$workspaceId/work', params: { workspaceId }, replace,
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId]);
  const target = scope ?? projects[0];
  const create = target ? () => void navigate({ to: '/demo/w/$workspaceId/p/$projectId/work-items/new', params: { workspaceId, projectId: target.id } }) : undefined;
  const items = useMemo(() => WORK_ITEMS.filter(item => projects.some(project => project.id === item.projectId) && (!scope || item.projectId === scope.id)), [projects, scope]);
  const projectFilter: ListFilter = { key: 'project', label: '프로젝트', icon: 'board', value: search.project,
    options: projects.map(project => ({ value: project.id, label: project.name })) };
  if (projects.length === 0) return <PageFrame title="작업" icon="board">
    <PageState title="첫 프로젝트를 만들어 보세요" description="작업은 프로젝트에 속합니다. 프로젝트를 만들면 여기에서 작업을 보고 만들 수 있습니다."
      actions={<Button label="프로젝트 만들기" variant="primary" onClick={() => void navigate({ to: '/demo/w/$workspaceId/projects', params: { workspaceId } })} />} />
  </PageFrame>;
  const chosen = valuesOf(search.assignee);
  const boardItems = items.filter(item => chosen.length === 0 || (item.assigneeId !== undefined && chosen.includes(item.assigneeId)));
  const assigneeFilter: ListFilter = { key: 'assignee', label: '담당자', icon: 'person', value: search.assignee, isMultiple: true, isSearchable: true,
    options: PEOPLE.map(person => ({ value: person.id, label: person.name, icon: <DefaultAvatar seed={person.id} name={person.name} size={20} /> })) };
  const action = create && { label: '새 작업', icon: 'plus', onClick: create, isCreate: true };
  return <PageFrame title={scope ? `${scope.name} · 작업` : '작업'} icon="board" chrome="header"
    tabs={<PageTabs value={view} items={VIEWS} panelId={panelId} onChange={next => go({ view: next === 'board' ? undefined : next as WorkSearch['view'] })} />}>
    <div role="tabpanel" id={panelId}>
      {view === 'table' && <WorkList workspaceId={workspaceId} items={items} search={search} filtersBefore={[projectFilter]}
        onChange={(patch: Partial<TableSearch> & { project?: string }, replace) => go(patch, replace)} onCreate={create} />}
      {(view === 'board' || view === 'list') && <ListToolbar label="작업 조건" filters={[projectFilter, assigneeFilter]}
        onFiltersChange={values => go({ project: values.project, assignee: values.assignee })} action={action} />}
      {view === 'board' && <BoardView workspaceId={workspaceId} items={boardItems} search={search} onCreate={create ?? (() => undefined)} />}
      {view === 'list' && <ListView workspaceId={workspaceId} items={boardItems} search={search} isScoped={!!scope} />}
      {view === 'gantt' && <PageState title="간트 보기는 준비 중입니다" description="시작일과 마감일이 있는 작업을 기간 막대로 놓아 보는 화면입니다. 지금은 칸반이나 표에서 날짜를 확인해 주세요." />}
    </div>
  </PageFrame>;
}
