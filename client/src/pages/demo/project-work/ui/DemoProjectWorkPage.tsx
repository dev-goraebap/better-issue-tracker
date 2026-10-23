import { useCallback, useId, useMemo } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { DefaultAvatar, ListToolbar, PageFrame, PageState, PageTabs, valuesOf, type PageTab } from '@/shared/ui';
import { DemoWorkList } from '@/widgets/demo-work-list';
import { PEOPLE, projectOf, WORK_ITEMS, type TableSearch, type WorkSearch, type WorkView } from '@/entities/demo-sample';
import { BacklogView } from './BacklogView';
import { BoardView } from './BoardView';

const VIEWS: PageTab<WorkView>[] = [
  { value: 'board', label: '보드', icon: 'board' }, { value: 'list', label: '목록', icon: 'list' },
  { value: 'backlog', label: '백로그', icon: 'rows' }, { value: 'timeline', label: '타임라인', icon: 'calendar' },
];

/**
 * PATTERN · 보기 탭이 있는 프로젝트 작업 (/demo/w/$workspaceId/p/$projectId, as the real /w/…/p/$projectId).
 *
 * - The views are PageTabs in the tab row under the header row; the chosen one is the URL's view (board left out), and
 *   switching keeps the list's conditions. The toolbar's tools sit at the tab row's end.
 * - 보드 uses the card's whole width (no PageFrame width); 목록 is the shared work list (DemoWorkList); 백로그 is rows
 *   read by title; 타임라인 is not built yet and says so with an empty state.
 * - A project the address does not name is a not-found state, never a blank page.
 */
export function DemoProjectWorkPage() {
  const { workspaceId, projectId } = useParams({ from: '/demo/w/$workspaceId/p/$projectId' });
  const search = useSearch({ from: '/demo/w/$workspaceId/p/$projectId' });
  const navigate = useNavigate();
  const panelId = useId();
  const project = projectOf(projectId);
  const view: WorkView = search.view ?? 'board';
  const go = useCallback((patch: Partial<WorkSearch>, replace = false) => void navigate({
    to: '/demo/w/$workspaceId/p/$projectId', params: { workspaceId, projectId }, replace,
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId, projectId]);
  const create = () => void navigate({ to: '/demo/w/$workspaceId/p/$projectId/work-items/new', params: { workspaceId, projectId } });
  const items = useMemo(() => WORK_ITEMS.filter(item => item.projectId === projectId), [projectId]);
  if (!project) return <PageFrame title="프로젝트를 찾을 수 없습니다">
    <PageState kind="not-found" title="프로젝트를 찾을 수 없습니다" description="지워졌거나 이 워크스페이스의 프로젝트가 아닙니다." />
  </PageFrame>;
  const chosen = valuesOf(search.assignee);
  const boardItems = items.filter(item => chosen.length === 0 || (item.assigneeId !== undefined && chosen.includes(item.assigneeId)));
  return <PageFrame title={project.name} icon="board" chrome="header"
    tabs={<PageTabs value={view} items={VIEWS} panelId={panelId} onChange={next => go({ view: next === 'board' ? undefined : next as WorkSearch['view'] })} />}>
    <div role="tabpanel" id={panelId}>
      {view === 'list' && <DemoWorkList workspaceId={workspaceId} items={items} search={search} onChange={(patch: Partial<TableSearch>, replace) => go(patch, replace)} onCreate={create} />}
      {view === 'board' && <>
        <ListToolbar label="보드 조건" onFiltersChange={values => go({ assignee: values.assignee })}
          filters={[{ key: 'assignee', label: '담당자', icon: 'person', value: search.assignee, isMultiple: true, isSearchable: true,
            options: PEOPLE.map(person => ({ value: person.id, label: person.name, icon: <DefaultAvatar seed={person.id} name={person.name} size={20} /> })) }]}
          action={{ label: '새 작업', icon: 'plus', onClick: create, isCreate: true }} />
        <BoardView workspaceId={workspaceId} items={boardItems} search={search} onCreate={create} />
      </>}
      {view === 'backlog' && <>
        <ListToolbar label="백로그 조건" action={{ label: '새 작업', icon: 'plus', onClick: create, isCreate: true }} />
        <BacklogView workspaceId={workspaceId} items={items} search={search} />
      </>}
      {view === 'timeline' && <PageState title="타임라인은 준비 중입니다" description="기한이 있는 작업을 날짜 위에 놓아 보는 화면입니다. 지금은 보드나 목록에서 기한을 확인해 주세요." />}
    </div>
  </PageFrame>;
}
