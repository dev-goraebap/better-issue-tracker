import { ProjectsPage } from '@/pages/workspace/projects';
import { WorkItemsPage, parseWorkSearch } from '@/pages/project/work-items';
import { WorkItemDetailPage } from '@/pages/project/work-item-detail';
import { ProjectSettingsPage } from '@/pages/settings/project';
import { projectQuery, columnsQuery, type ProjectStatus } from '@/entities/project';
import { byRefQuery } from '@/entities/work-item';
import { parseTaskSearch } from '@/features/work-item-filters';
import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { HomePage } from '@/pages/workspace/home';
import { InboxPage } from '@/pages/workspace/inbox';
import { MyTasksPage } from '@/pages/workspace/my-tasks';
import { MembersPage } from '@/pages/workspace/members';
import { invitationsQuery } from '@/pages/workspace/members';
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
import { membersQuery, workspaceQuery, workspacesQuery } from '@/entities/workspace';
import { ApiError, bootstrapQueryOptions, capabilitiesQueryOptions, keyQueryOptions, resetCsrf, sessionQueryOptions, setUnauthorizedHandler } from '@/shared/api';
import { RootLayout } from '../layout/RootLayout';
import { RouteError } from '../layout/RouteError';
import { WorkspaceLayout } from '../layout/WorkspaceLayout';
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
const workspace = createRoute({ getParentRoute: () => rootRoute, id: 'workspace', component: WorkspaceLayout,
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
const home = createRoute({ getParentRoute: () => scoped, path: '/', component: HomePage });
const inbox = createRoute({ getParentRoute: () => scoped, path: '/inbox', component: InboxPage });
const myTasks = createRoute({ getParentRoute: () => scoped, path: '/my-tasks', component: MyTasksPage, validateSearch: (raw: Record<string, unknown>) => { const value = parseTaskSearch(raw); return { ...value, assigneeId: '', column: '', order: value.order === 'position_asc' ? 'createdAt_desc' as const : value.order }; } });
async function loadProject(w: string, p: string) {
  try { await routeRead(() => queryClient.fetchQuery(projectQuery(w, p))); }
  catch (error) { if (error instanceof ApiError && error.status === 404) { queryClient.removeQueries({ queryKey: ['workspace', w, 'project', p] }); throw redirect({ href: `/w/${w}/projects` }); } throw error; }
}
const projects = createRoute({ getParentRoute: () => scoped, path: '/projects', component: ProjectsPage, validateSearch: (raw: Record<string, unknown>): { status: ProjectStatus; q: string } => ({ status: raw.status === 'archived' || raw.status === 'deleted' ? raw.status : 'active', q: typeof raw.q === 'string' ? raw.q : '' }) });
const projectItems = createRoute({ getParentRoute: () => scoped, path: '/p/$projectId', component: WorkItemsPage, validateSearch: parseWorkSearch, loader: async ({ params }) => { await loadProject(params.workspaceId, params.projectId); await queryClient.prefetchQuery(columnsQuery(params.workspaceId, params.projectId)); } });
const projectSettings = createRoute({ getParentRoute: () => scoped, path: '/p/$projectId/settings', component: ProjectSettingsPage, loader: ({ params }) => loadProject(params.workspaceId, params.projectId) });
const itemDetail = createRoute({ getParentRoute: () => scoped, path: '/p/$projectId/work-items/$workItemId', component: WorkItemDetailPage, loader: ({ params }) => loadProject(params.workspaceId, params.projectId) });
const itemReference = createRoute({ getParentRoute: () => scoped, path: '/r/$reference', loader: async ({ params }) => { const item = await routeRead(() => queryClient.fetchQuery(byRefQuery(params.workspaceId, params.reference))); throw redirect({ href: `/w/${params.workspaceId}/p/${item.projectId}/work-items/${item.id}` }); } });
const members = createRoute({ getParentRoute: () => scoped, path: '/members', component: MembersPage,
  validateSearch: (search: Record<string, unknown>): { cursor?: string; view: 'members' | 'invitations'; status: string } => ({ ...pageCursor(search), view: search.view === 'invitations' ? 'invitations' : 'members', status: typeof search.status === 'string' && ['pending','accepted','expired','revoked'].includes(search.status) ? search.status : '' }),
  loaderDeps: ({ search }) => search, loader: async ({ params, deps }) => { const space = await routeRead(() => queryClient.fetchQuery(workspaceQuery(params.workspaceId))); if (deps.view === 'members') await queryClient.prefetchQuery(membersQuery(params.workspaceId, deps.cursor)); else if (space.myRole === 'owner' || space.myRole === 'admin') await queryClient.prefetchQuery(invitationsQuery(params.workspaceId, deps.status, deps.cursor)); } });
const documents = createRoute({ getParentRoute: () => scoped, path: '/documents', component: DocumentsPage });
const settings = createRoute({ getParentRoute: () => scoped, path: '/settings', component: WorkspaceSettingsPage, validateSearch: pageCursor, loaderDeps: ({ search }) => search, loader: ({ params, deps }) => queryClient.prefetchQuery(membersQuery(params.workspaceId, deps.cursor)) });
const security = createRoute({ getParentRoute: () => workspace, path: '/settings/security', component: SecurityPage });
const appearance = createRoute({ getParentRoute: () => workspace, path: '/settings/appearance', component: AppearancePage });
const keys = createRoute({ getParentRoute: () => workspace, path: '/settings/api-keys', component: ApiKeysPage, validateSearch: pageCursor, loaderDeps: ({ search }) => search, loader: ({ deps }) => queryClient.prefetchQuery(keyQueryOptions(deps.cursor)) });
const legacy = ['/inbox', '/my-tasks', '/members', '/documents'].map(path => createRoute({ getParentRoute: () => workspace, path, beforeLoad: () => resume(path) }));
const login = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage, beforeLoad: () => entryGuard(false) });
const setup = createRoute({ getParentRoute: () => rootRoute, path: '/setup', component: BootstrapPage, beforeLoad: () => entryGuard(true) });
const join = createRoute({ getParentRoute: () => rootRoute, path: '/join', component: JoinPage });
const forcedPassword = createRoute({ getParentRoute: () => rootRoute, path: '/change-password', component: ChangePasswordPage, beforeLoad: async () => { const session = await requireSession(); if (!session.mustChangePassword) throw redirect({ to: '/settings/security' }); } });
export const router = createRouter({ routeTree: rootRoute.addChildren([workspace.addChildren([start, chooser, scoped.addChildren([home, inbox, myTasks, members, documents, settings, projects, projectItems, projectSettings, itemDetail, itemReference]), security, keys, appearance, ...legacy]), login, setup, join, forcedPassword]), defaultPreload: 'intent', scrollRestoration: true });
setUnauthorizedHandler(() => { resetCsrf(); void queryClient.cancelQueries().then(() => { queryClient.clear(); void router.navigate({ to: '/login' }); }); });
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
