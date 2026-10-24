import { useCallback, useEffect, useId, useState, type MouseEvent } from 'react';
import { Button, useToast } from '@astryxdesign/core';
import { useNavigate, useParams, useRouterState, useSearch } from '@tanstack/react-router';
import { PanelHostContext, useScreenPanel, withoutPanel } from '@/shared/lib/routed-panel';
import { ConfirmDialog, PageFrame, PageState, RoutedPanel } from '@/shared/ui';
import {
  ALL_VIEW, addView, effectiveView, projectOf, removeView, updateView, useIssues, useProjects, useViews, useViewTweak, VIEW_COLORS, type IssueSearch, type Status,
} from '@/entities/demo-sample';
import type { Scope } from '../model/scope';
import { CreateIssueDialog } from './CreateIssueDialog';
import { IssuePanel, ISSUE_PATH } from './IssuePanel';
import { IssuesView } from './IssuesView';
import { ViewEditor, type ViewDraft } from './ViewEditor';
import { ViewTabs } from './ViewTabs';

type Editing = { mode: 'create' | 'edit'; initial: ViewDraft };

/**
 * PATTERN · 이슈와 뷰, /demo/w/$workspaceId/p/$projectId, and 전체 at /demo/w/$workspaceId (the home, D-065). Copy this
 * page for one kind of thing seen through views the members make (D-066, D-068).
 *
 * - The scope is the trail's switcher (전체 or a project); the views are the workspace's, the same in either scope,
 *   their chips in the tab row (ViewTabs) with 전체 이슈 first, the + to make one and the view's menu to change, copy or
 *   remove it. The view in sight is the address's (v; 전체 이슈 when left out).
 * - A new view takes the list's conditions as they stand; its card (ViewEditor) opens over the list, as Linear's.
 * - 새 이슈 (the toolbar's action, a board column's +, or the C key) opens the dialog over the page (CreateIssueDialog);
 *   what it makes shows at once, with a toast to open it.
 * - An issue pressed in any layout opens in a modal over the page at its own address (a masked move, useScreenPanel and
 *   RoutedPanel as SandboxHr's, D-069): the list stays under it, back or Esc closes it, 크게 보기 goes to the issue's page.
 *   A modified click still opens the page in a new tab; reloaded, opened from a link or on a phone, the address is the page.
 * - A project the address does not name is a not-found state, never a blank page.
 */
export function DemoProjectPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId?: string };
  const fullSearch = useSearch({ strict: false }) as IssueSearch;
  // The list's own place; the issue open over it (panel, depth) belongs to the modal.
  const search = withoutPanel(fullSearch);
  const pathname = useRouterState({ select: state => state.location.pathname });
  const { host, depth } = useScreenPanel(pathname, fullSearch, search);
  const navigate = useNavigate();
  const panelId = useId();
  const toast = useToast();
  const projects = useProjects(workspaceId).filter(each => each.status === 'active');
  const project = projectId ? projectOf(projectId) : undefined;
  const issues = useIssues();
  const views = useViews(workspaceId);
  const view = views.find(each => each.id === (search.v ?? ALL_VIEW)) ?? views[0]!;
  const tweak = useViewTweak(view.id);
  const effective = effectiveView(view, tweak, search);
  const scope: Scope = { workspaceId, project, projectIds: project ? [project.id] : projects.map(each => each.id), firstProject: project ?? projects[0] };
  const [creating, setCreating] = useState<{ status?: Status } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [isRemoving, setRemoving] = useState(false);
  // The page in view (전체 or the project) with its address's conditions changed, or a view's fresh start.
  const place = useCallback((next: IssueSearch, replace = false) => {
    if (projectId) void navigate({ to: '/demo/w/$workspaceId/p/$projectId', params: { workspaceId, projectId }, search: next, replace });
    else void navigate({ to: '/demo/w/$workspaceId', params: { workspaceId }, search: next, replace });
  }, [navigate, workspaceId, projectId]);
  const go = useCallback((patch: Partial<IssueSearch>, replace = false) => place(
    Object.fromEntries(Object.entries({ ...search, ...patch }).filter(([, value]) => value !== undefined)) as IssueSearch, replace), [place, search]);
  const pick = (id: string) => { setEditing(null); place(id === ALL_VIEW ? {} : { v: id }); };
  // An issue's link pressed (a plain click) opens the modal instead of leaving the list.
  const peek = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    const href = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]')?.getAttribute('href');
    if (!href || !ISSUE_PATH.test(href.split(/[?#]/)[0]!)) return;
    event.preventDefault();
    host.open(href);
  };
  // C opens 새 이슈, as Linear's, unless the member is typing or something is already open.
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
  if (projectId && !project) return <PageFrame title="프로젝트를 찾을 수 없습니다">
    <PageState kind="not-found" title="프로젝트를 찾을 수 없습니다" description="지워졌거나 이 워크스페이스의 프로젝트가 아닙니다." />
  </PageFrame>;
  const startCreate = () => setEditing({ mode: 'create', initial: { name: '', description: '', icon: 'list', color: VIEW_COLORS[1]!, isPersonal: false } });
  const saveView = (draft: ViewDraft) => {
    if (editing?.mode === 'edit') { updateView(workspaceId, view.id, draft); setEditing(null); return; }
    const id = addView({ workspaceId, ...draft, layout: effective.layout, filters: effective.filters, sort: effective.sort, columns: effective.columns });
    setEditing(null);
    place({ v: id });
  };
  const copy = () => {
    const id = addView({ ...view, name: `${view.name} 사본`, isBuiltIn: undefined });
    place({ v: id });
  };
  return <PanelHostContext.Provider value={host}><PageFrame title={project?.name ?? '홈'} icon={project ? 'board' : 'home'} chrome="header"
    tabs={<ViewTabs views={views} value={view.id} panelId={panelId} onPick={pick} onCreate={startCreate} onCopy={copy} onRemove={() => setRemoving(true)}
      onEdit={() => setEditing({ mode: 'edit', initial: { name: view.name, description: view.description ?? '', icon: view.icon, color: view.color, isPersonal: view.isPersonal } })} />}>
    <div role="tabpanel" id={panelId} onClickCapture={peek}>
      {editing && <ViewEditor key={`${editing.mode}-${view.id}`} initial={editing.initial} mode={editing.mode} onCancel={() => setEditing(null)} onSave={saveView} />}
      <IssuesView scope={scope} view={view} tweak={tweak} effective={effective} issues={issues} search={search} go={go}
        onCreate={status => setCreating({ status })} onSaveAsView={startCreate} />
    </div>
    <CreateIssueDialog isOpen={!!creating} projects={projects} project={project} status={creating?.status} onClose={() => setCreating(null)}
      onCreated={issue => toast({ body: `${issue.key} ${issue.title}을(를) 만들었습니다.`,
        // The toast lives in a layer above the router, so its way to the issue opens the modal rather than linking.
        endContent: <Button label="보기" variant="ghost" size="sm" onClick={() => host.open(`/demo/w/${workspaceId}/p/${issue.projectId}/work-items/${issue.id}`)} /> })} />
    {fullSearch.panel && <RoutedPanel label="이슈" href={fullSearch.panel} depth={depth} host={host}><IssuePanel href={fullSearch.panel} /></RoutedPanel>}
    {isRemoving && <ConfirmDialog title={`'${view.name}' 뷰를 지울까요?`} description={view.isPersonal ? '나만 보던 뷰가 사라집니다. 이슈는 그대로 남습니다.' : '워크스페이스의 모두에게서 이 뷰가 사라집니다. 이슈는 그대로 남습니다.'}
      confirmLabel="지우기" variant="destructive" onClose={() => setRemoving(false)}
      onConfirm={() => { setRemoving(false); removeView(workspaceId, view.id); place({}); }} />}
  </PageFrame></PanelHostContext.Provider>;
}
