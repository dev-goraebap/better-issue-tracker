import { ProjectsPage } from '@/pages/workspace/projects';
import { IssuesPage } from '@/pages/workspace/issues';
import { NewIssuePage } from '@/pages/workspace/issue-new';
import { IssuePage } from '@/pages/project/issue';
import { IssueEditPage } from '@/pages/project/issue-edit';
import { ProjectSettingsPage } from '@/pages/settings/project';
import { projectQuery, columnsQuery, type ProjectStatus } from '@/entities/project';
import { byRefQuery, parseIssueSearch as parseRealIssueSearch, parseNewIssueSearch as parseRealNewIssueSearch } from '@/entities/work-item';
import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { InboxPage } from '@/pages/workspace/inbox';
import { MembersPage, parseMembersSearch } from '@/pages/workspace/members';
import { ProfilePage } from '@/pages/settings/profile';
import { StatesPage, parseStatesSearch } from '@/pages/patterns/states';
import { DialogsPage } from '@/pages/patterns/dialogs';
import { DocumentsPage } from '@/pages/workspace/documents';
import { NotFoundPage } from '@/pages/entry/not-found';
import { LoginPage } from '@/pages/entry/login';
import { BootstrapPage } from '@/pages/entry/bootstrap';
import { ChangePasswordPage } from '@/pages/entry/change-password';
import { WorkspacesPage } from '@/pages/entry/workspaces';
import { JoinPage, captureJoinEntry } from '@/pages/entry/join';
import { SecurityPage } from '@/pages/settings/security';
import { ApiKeysPage } from '@/pages/settings/api-keys';
import { WorkspaceSettingsPage } from '@/pages/settings/workspace';
import { AppearancePage } from '@/pages/settings/appearance';
import { followHistory } from '@/shared/lib/history-trail';
import { ownSearch } from '@/shared/lib/route-search';
import { workspaceQuery, workspacesQuery } from '@/entities/workspace';
import { ApiError, bootstrapQueryOptions, capabilitiesQueryOptions, keyQueryOptions, resetCsrf, sessionQueryOptions, setUnauthorizedHandler } from '@/shared/api';
import { RootLayout } from '../layout/RootLayout';
import { RouteError } from '../layout/RouteError';
import { AppLayout } from '../layout/AppLayout';
import { queryClient } from '../model/query-client';
import { routeRead } from '../model/route-read';

captureJoinEntry();
async function requireSession() {
  const session = await routeRead(() => queryClient.fetchQuery(sessionQueryOptions));
  if (!session) {
    await queryClient.cancelQueries(); queryClient.clear(); resetCsrf();
    const status = await routeRead(() => queryClient.fetchQuery(bootstrapQueryOptions));
    throw redirect({ to: status.canBootstrap ? '/setup' : '/login' });
  }
  return session;
}
async function entryGuard(setup: boolean) {
  const session = await routeRead(() => queryClient.fetchQuery(sessionQueryOptions));
  if (session) throw redirect({ to: session.mustChangePassword ? '/change-password' : '/' });
  const status = await routeRead(() => queryClient.fetchQuery(bootstrapQueryOptions));
  if (status.canBootstrap !== setup) throw redirect({ to: status.canBootstrap ? '/setup' : '/login' });
}
async function resume(suffix = '') {
  const session = await requireSession();
  if (session.mustChangePassword) throw redirect({ to: '/change-password' });
  const activeWorkspaceId = session.activeWorkspaceId;
  if (activeWorkspaceId) {
    try { await routeRead(() => queryClient.fetchQuery(workspaceQuery(activeWorkspaceId))); throw redirect({ href: `/w/${activeWorkspaceId}${suffix}` }); }
    catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; }
  }
  const spaces = await routeRead(() => queryClient.fetchQuery(workspacesQuery()));
  if (spaces.items.length === 1 && !spaces.nextCursor) throw redirect({ href: `/w/${spaces.items[0].id}${suffix}` });
  throw redirect({ to: '/workspaces' });
}
const pageCursor = (search: Record<string, unknown>): { cursor?: string } => ({ cursor: typeof search.cursor === 'string' ? search.cursor : undefined });
const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage, errorComponent: RouteError, loader: () => queryClient.prefetchQuery(capabilitiesQueryOptions) });
const workspace = createRoute({ getParentRoute: () => rootRoute, id: 'workspace', component: AppLayout,
  beforeLoad: async () => { const session = await requireSession(); if (session.mustChangePassword) throw redirect({ to: '/change-password' }); },
  loader: () => queryClient.prefetchQuery(workspacesQuery()) });
const start = createRoute({ getParentRoute: () => workspace, path: '/', beforeLoad: () => resume() });
const chooser = createRoute({ getParentRoute: () => workspace, path: '/workspaces', component: WorkspacesPage, validateSearch: pageCursor, loaderDeps: ({ search }) => search, loader: ({ deps }) => queryClient.prefetchQuery(workspacesQuery(deps.cursor)) });
const scoped = createRoute({ getParentRoute: () => workspace, path: '/w/$workspaceId', beforeLoad: async ({ params }) => {
  const id = params.workspaceId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw redirect({ to: '/workspaces' });
  try { await routeRead(() => queryClient.fetchQuery(workspaceQuery(id))); }
  catch (error) { if (error instanceof ApiError && error.status === 404) { queryClient.removeQueries({ queryKey: ['workspace', id] }); throw redirect({ to: '/workspaces' }); } throw error; }
} });
// A workspace opens on its home, 전체: the issues of every project through the workspace's views (D-065, D-066).
const home = createRoute({ getParentRoute: () => scoped, path: '/', component: IssuesPage, validateSearch: ownSearch(parseRealIssueSearch) });
// 새 이슈 at its own address, which the issue pages open in a modal (D-070).
const issuesNew = createRoute({ getParentRoute: () => scoped, path: '/issues/new', component: NewIssuePage, validateSearch: ownSearch(parseRealNewIssueSearch) });
const inbox = createRoute({ getParentRoute: () => scoped, path: '/inbox', component: InboxPage });
// 내 작업 is a view now (담당자 filter, D-066); its old address leads home.
const myTasks = createRoute({ getParentRoute: () => scoped, path: '/my-tasks', beforeLoad: ({ params }) => { throw redirect({ href: `/w/${params.workspaceId}` }); } });
async function loadProject(w: string, p: string) {
  try { await routeRead(() => queryClient.fetchQuery(projectQuery(w, p))); }
  catch (error) { if (error instanceof ApiError && error.status === 404) { queryClient.removeQueries({ queryKey: ['workspace', w, 'project', p] }); throw redirect({ href: `/w/${w}/projects` }); } throw error; }
}
const projects = createRoute({ getParentRoute: () => scoped, path: '/projects', component: ProjectsPage, validateSearch: (raw: Record<string, unknown>): { status: ProjectStatus; q: string } => ({ status: raw.status === 'archived' || raw.status === 'deleted' ? raw.status : 'active', q: typeof raw.q === 'string' ? raw.q : '' }) });
const projectItems = createRoute({ getParentRoute: () => scoped, path: '/p/$projectId', component: IssuesPage, validateSearch: ownSearch(parseRealIssueSearch), loader: async ({ params }) => { await loadProject(params.workspaceId, params.projectId); await queryClient.prefetchQuery(columnsQuery(params.workspaceId, params.projectId)); } });
// 워크스페이스 설정 turns the menu into the workspace's settings: its pages, then each project's (D-061).
const projectSettingsStart = createRoute({ getParentRoute: () => scoped, path: '/settings/projects/$projectId', beforeLoad: ({ params }) => { throw redirect({ href: `/w/${params.workspaceId}/settings/projects/${params.projectId}/general` }); } });
const projectSettings = createRoute({ getParentRoute: () => scoped, path: '/settings/projects/$projectId/$section', component: ProjectSettingsPage, loader: ({ params }) => loadProject(params.workspaceId, params.projectId) });
const oldProjectSettings = createRoute({ getParentRoute: () => scoped, path: '/p/$projectId/settings', beforeLoad: ({ params }) => { throw redirect({ href: `/w/${params.workspaceId}/settings/projects/${params.projectId}/general` }); } });
const itemNew = createRoute({ getParentRoute: () => scoped, path: '/p/$projectId/work-items/new', component: NewIssuePage, validateSearch: ownSearch(parseRealNewIssueSearch), loader: ({ params }) => loadProject(params.workspaceId, params.projectId) });
const itemDetail = createRoute({ getParentRoute: () => scoped, path: '/p/$projectId/work-items/$workItemId', component: IssuePage, validateSearch: ownSearch(parseRealIssueSearch), loader: ({ params }) => loadProject(params.workspaceId, params.projectId) });
const itemEdit = createRoute({ getParentRoute: () => scoped, path: '/p/$projectId/work-items/$workItemId/edit', component: IssueEditPage, loader: ({ params }) => loadProject(params.workspaceId, params.projectId) });
const itemReference = createRoute({ getParentRoute: () => scoped, path: '/r/$reference', loader: async ({ params }) => { const item = await routeRead(() => queryClient.fetchQuery(byRefQuery(params.workspaceId, params.reference))); throw redirect({ href: `/w/${params.workspaceId}/p/${item.projectId}/work-items/${item.id}` }); } });
const members = createRoute({ getParentRoute: () => scoped, path: '/members', component: MembersPage, validateSearch: ownSearch(parseMembersSearch) });
const documents = createRoute({ getParentRoute: () => scoped, path: '/documents', component: DocumentsPage });
const settingsStart = createRoute({ getParentRoute: () => scoped, path: '/settings', beforeLoad: ({ params }) => { throw redirect({ href: `/w/${params.workspaceId}/settings/general` }); } });
const settings = createRoute({ getParentRoute: () => scoped, path: '/settings/$section', component: WorkspaceSettingsPage });
const profile = createRoute({ getParentRoute: () => workspace, path: '/settings/profile', component: ProfilePage });
const security = createRoute({ getParentRoute: () => workspace, path: '/settings/security', component: SecurityPage });
const appearance = createRoute({ getParentRoute: () => workspace, path: '/settings/appearance', component: AppearancePage });
const keys = createRoute({ getParentRoute: () => workspace, path: '/settings/api-keys', component: ApiKeysPage, loader: () => queryClient.prefetchQuery(keyQueryOptions()) });
// The UI patterns (dev only): screen states and dialogs to copy from, inside the real shell.
const patterns = import.meta.env.DEV ? [
  createRoute({ getParentRoute: () => workspace, path: '/patterns/states', component: StatesPage, validateSearch: ownSearch(parseStatesSearch) }),
  createRoute({ getParentRoute: () => workspace, path: '/patterns/dialogs', component: DialogsPage }),
] : [];
const legacy = ['/inbox', '/my-tasks', '/members', '/documents'].map(path => createRoute({ getParentRoute: () => workspace, path, beforeLoad: () => resume(path) }));
const login = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage, beforeLoad: () => entryGuard(false) });
const setup = createRoute({ getParentRoute: () => rootRoute, path: '/setup', component: BootstrapPage, beforeLoad: () => entryGuard(true) });
const join = createRoute({ getParentRoute: () => rootRoute, path: '/join', component: JoinPage });
const forcedPassword = createRoute({ getParentRoute: () => rootRoute, path: '/change-password', component: ChangePasswordPage, beforeLoad: async () => { const session = await requireSession(); if (!session.mustChangePassword) throw redirect({ to: '/settings/security' }); } });
export const router = createRouter({ routeTree: rootRoute.addChildren([workspace.addChildren([start, chooser, scoped.addChildren([home, issuesNew, inbox, myTasks, members, documents, settingsStart, settings, projects, projectItems, projectSettingsStart, projectSettings, oldProjectSettings, itemNew, itemDetail, itemEdit, itemReference]), profile, security, keys, appearance, ...patterns, ...legacy]), login, setup, join, forcedPassword]), defaultPreload: 'intent', scrollRestoration: true,
  // A panel opened over a screen shows the page's own address (a masked move); reloaded, the address is that page (D-069).
  unmaskOnReload: true });
setUnauthorizedHandler(() => { resetCsrf(); void queryClient.cancelQueries().then(() => { queryClient.clear(); void router.navigate({ to: '/login' }); }); });
followHistory(router.history);
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
