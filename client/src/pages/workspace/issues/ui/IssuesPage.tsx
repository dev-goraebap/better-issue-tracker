import { useCallback, useEffect, useEffectEvent, useId, useMemo, useState, type MouseEvent } from 'react';
import { useToast } from '@astryxdesign/core';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useRouterState, useSearch } from '@tanstack/react-router';
import { PALETTE } from '@/shared/config';
import { authError, isNotFound, sessionQueryOptions } from '@/shared/api';
import { isPlainClick } from '@/shared/lib/history-trail';
import { isForOther } from '@/shared/lib/key-target';
import { PanelHostContext, useScreenPanel, withoutPanel } from '@/shared/lib/routed-panel';
import { ConfirmDialog, PageFrame, PageState, RequestBoundary, RoutedPanel } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { columnsQuery, projectQuery, projectsQuery } from '@/entities/project';
import { canWrite as canWriteIn, useMembers, workspaceQuery } from '@/entities/workspace';
import {
  ALL_VIEW, addView, effectiveView, removeView, updateView, useScopeItems, useViews, useViewTweak, type IssueSearch,
} from '@/entities/issue';
import type { Scope } from '../model/scope';
import { IssuePanel, ISSUE_PATH, NEW_PATH } from './IssuePanel';
import { IssuesView } from './IssuesView';
import { ViewEditor, type ViewDraft } from './ViewEditor';
import { ViewTabs } from './ViewTabs';

type Editing = { mode: 'create' | 'edit'; initial: ViewDraft };

/**
 * PATTERN · 이슈와 뷰, /workspaces/$workspaceId/projects/$projectId, and 전체 at /workspaces/$workspaceId (the home, D-065). One kind of thing
 * seen through views the members make (D-066, D-068), read from the server: every live issue of the scope at once
 * (useScopeItems), filtered, ordered and grouped on the page.
 *
 * - The scope is the trail's switcher (전체 or a project); the views are the workspace's, the same in either scope,
 *   their chips in the tab row (ViewTabs) with 전체 이슈 first, the + to make one and the view's menu to change, copy or
 *   remove it. The view in sight is the address's (v; 전체 이슈 when left out).
 * - A new view takes the list's conditions as they stand; its card (ViewEditor) opens over the list, as Linear's.
 * - 새 이슈 (the toolbar's action, a board lane's +, or the C key) opens at its own address in a modal near the top
 *   (NewIssue, D-070): …/issues/new in a project, …/issues/new in 전체, ?status= from a lane's +.
 * - An issue pressed in any layout opens in a modal over the page at its own address (a masked move, D-069): the list
 *   stays under it, back or Esc closes it, 크게 보기 goes to the issue's page. Reloaded, the address is the page.
 */
export function IssuesPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId?: string };
  const fullSearch = useSearch({ strict: false }) as IssueSearch;
  // The list's own place; the issue open over it (panel, depth) belongs to the modal.
  const search = useMemo(() => withoutPanel(fullSearch), [fullSearch]);
  const pathname = useRouterState({ select: state => state.location.pathname });
  const { host, depth } = useScreenPanel(pathname, fullSearch, search);
  const navigate = useNavigate();
  const panelId = useId();
  const me = useQuery(sessionQueryOptions).data?.user.id ?? '';
  const role = useQuery(workspaceQuery(workspaceId)).data?.myRole;
  const projects = useInfiniteQuery(projectsQuery(workspaceId)).data?.pages.flatMap(page => page.items) ?? [];
  const project = useQuery({ ...projectQuery(workspaceId, projectId ?? ''), enabled: !!projectId });
  const columns = useQuery({ ...columnsQuery(workspaceId, projectId ?? ''), enabled: !!projectId }).data ?? [];
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const members = useMembers(workspaceId).items;
  const scopeItems = useScopeItems(workspaceId, projectId);
  const client = useQueryClient();
  const toast = useToast();
  const views = useViews(workspaceId);
  const view = views.find(each => each.id === (search.v ?? ALL_VIEW)) ?? views[0]!;
  const tweak = useViewTweak(workspaceId, view.id);
  const effective = useMemo(() => effectiveView(view, tweak, search), [view, tweak, search]);
  const canWrite = canWriteIn(role);
  const scope: Scope = { workspaceId, project: project.data, projects, firstProject: project.data ?? projects[0], columns, me, role, canWrite };
  const [editing, setEditing] = useState<Editing | null>(null);
  const [isRemoving, setRemoving] = useState(false);
  // The page in view (전체 or the project) with its address's conditions changed, or a view's fresh start.
  const place = useCallback((next: IssueSearch, replace = false) => {
    if (projectId) void navigate({ to: '/workspaces/$workspaceId/projects/$projectId', params: { workspaceId, projectId }, search: next, replace });
    else void navigate({ to: '/workspaces/$workspaceId', params: { workspaceId }, search: next, replace });
  }, [navigate, workspaceId, projectId]);
  const go = useCallback((patch: Partial<IssueSearch>, replace = false) => place(
    Object.fromEntries(Object.entries({ ...search, ...patch }).filter(([, value]) => value !== undefined)) as IssueSearch, replace), [place, search]);
  const pick = (id: string) => { setEditing(null); place(id === ALL_VIEW ? {} : { v: id }); };
  // 새 이슈 at its address: the project's, or 전체's; a board lane's + says where it starts.
  const openNew = (status?: string) => {
    if (!canWrite) return;
    const path = projectId ? `/workspaces/${workspaceId}/projects/${projectId}/issues/new` : `/workspaces/${workspaceId}/issues/new`;
    host.open(status ? `${path}?status=${status}` : path);
  };
  // An issue's link pressed (a plain click) opens the modal instead of leaving the list.
  const peek = (event: MouseEvent) => {
    if (!isPlainClick(event) || event.defaultPrevented) return;
    const href = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]')?.getAttribute('href');
    if (!href || !ISSUE_PATH.test(href.split(/[?#]/)[0]!)) return;
    event.preventDefault();
    host.open(href);
  };
  // C opens 새 이슈, as Linear's, unless the member is typing or something is already open.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== 'c' || isForOther(event)) return;
    event.preventDefault();
    openNew();
  });
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (projectId && isNotFound(project.error)) return <PageFrame title="프로젝트를 찾을 수 없습니다">
    <PageState kind="not-found" title="프로젝트를 찾을 수 없습니다" description="지워졌거나 이 워크스페이스의 프로젝트가 아닙니다." />
  </PageFrame>;
  const startCreate = () => setEditing({ mode: 'create', initial: { name: '', description: '', icon: 'list', color: PALETTE[1]!.value, isPersonal: false } });
  const saveView = (draft: ViewDraft) => {
    if (editing?.mode === 'edit') {
      void updateView(client, view, draft).then(() => setEditing(null)).catch(failure => toast({ body: authError(failure) }));
      return;
    }
    void addView(client, workspaceId, { ...draft, layout: effective.layout, filters: effective.filters, sort: effective.sort, columns: effective.columns })
      .then(id => { setEditing(null); place({ v: id }); }).catch(failure => toast({ body: authError(failure) }));
  };
  const copy = () => {
    void addView(client, workspaceId, { ...view, name: `${view.name} 사본`, isPersonal: view.isBuiltIn ? false : view.isPersonal })
      .then(id => place({ v: id })).catch(failure => toast({ body: authError(failure) }));
  };
  const panelPath = fullSearch.panel?.split('?')[0] ?? '';
  return <PanelHostContext.Provider value={host}><PageFrame title={project.data?.name ?? '홈'} icon={projectId ? 'board' : 'home'} chrome="header"
    tabs={<ViewTabs views={views} value={view.id} panelId={panelId} onPick={pick} onCreate={startCreate} onCopy={copy} onRemove={() => setRemoving(true)}
      onEdit={() => setEditing({ mode: 'edit', initial: { name: view.name, description: view.description ?? '', icon: view.icon, color: view.color, isPersonal: view.isPersonal } })} />}>
    <div role="tabpanel" id={panelId} onClickCapture={peek}>
      {editing && <ViewEditor key={`${editing.mode}-${view.id}`} initial={editing.initial} mode={editing.mode} onCancel={() => setEditing(null)} onSave={saveView} />}
      <RequestBoundary pending={scopeItems.isLoading} hasData={!scopeItems.isMissing} error={scopeItems.error} retry={() => { void scopeItems.refetch(); }}>
        <IssuesView scope={scope} view={view} tweak={tweak} effective={effective} issues={scopeItems.items} labels={labels} members={members} search={search} go={go}
          onCreate={canWrite ? openNew : undefined} onSaveAsView={startCreate} />
      </RequestBoundary>
    </div>
    {fullSearch.panel && <RoutedPanel label={NEW_PATH.test(panelPath) ? '새 이슈' : '이슈'} href={fullSearch.panel} depth={depth} host={host}
      size={NEW_PATH.test(panelPath) ? 'form' : 'content'}><IssuePanel href={fullSearch.panel} /></RoutedPanel>}
    {isRemoving && <ConfirmDialog title={`'${view.name}' 뷰를 지울까요?`} description={view.isPersonal ? '나만 보던 뷰가 사라집니다. 이슈는 그대로 남습니다.' : '워크스페이스의 모두에게서 이 뷰가 사라집니다. 이슈는 그대로 남습니다.'}
      confirmLabel="지우기" variant="destructive" onClose={() => setRemoving(false)}
      onConfirm={() => { setRemoving(false); void removeView(client, view).then(() => place({})).catch(failure => toast({ body: authError(failure) })); }} />}
  </PageFrame></PanelHostContext.Provider>;
}
