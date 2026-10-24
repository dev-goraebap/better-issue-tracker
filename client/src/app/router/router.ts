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
import { DemoWorkspacesPage } from '@/pages/demo/workspaces';
import { DemoInboxPage } from '@/pages/demo/inbox';
import { DemoMembersPage } from '@/pages/demo/members';
import { DemoDocumentsPage } from '@/pages/demo/documents';
import { DemoProjectsPage } from '@/pages/demo/projects';
import { DemoProjectPage } from '@/pages/demo/project';
import { DemoDetailPage } from '@/pages/demo/item-detail';
import { DemoFormPage } from '@/pages/demo/item-form';
import { DemoNewIssuePage } from '@/pages/demo/issue-new';
import { DemoWorkspaceSettingsPage } from '@/pages/demo/settings/workspace';
import { DemoProjectSettingsPage } from '@/pages/demo/settings/project';
import { DemoAdminPage } from '@/pages/demo/settings/admin';
import { DemoStatesPage } from '@/pages/demo/states';
import { DemoDialogsPage } from '@/pages/demo/dialogs';
import { DemoProfilePage } from '@/pages/demo/account-profile';
import { DemoAppearancePage } from '@/pages/demo/account-appearance';
import { DemoNotificationsPage } from '@/pages/demo/account-notifications';
import { DemoApiKeysPage } from '@/pages/demo/account-api-keys';
import { DemoSecurityPage } from '@/pages/demo/account-security';
import { DEFAULT_WORKSPACE, parseInboxSearch, parseMembersSearch, parseProjectsSearch, parseStatesSearch, parseIssueSearch, parseNewIssueSearch } from '@/entities/demo-sample';
import { DemoLayout } from '../layout/DemoLayout';
import { followHistory } from '@/shared/lib/history-trail';
import { ownSearch } from '@/shared/lib/route-search';
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
// The UI demo (dev only): the real app's menus and addresses under /demo, every screen pattern on mock data inside the
// real shell, a reference for new screens (D-058).
const demo = createRoute({ getParentRoute: () => rootRoute, path: '/demo', component: DemoLayout });
const demoStart = createRoute({ getParentRoute: () => demo, path: '/', beforeLoad: () => { throw redirect({ href: `/demo/w/${DEFAULT_WORKSPACE}` }); } });
const demoSpace = createRoute({ getParentRoute: () => demo, path: '/w/$workspaceId' });
const demoInboxRoutes = [
  createRoute({ getParentRoute: () => demoSpace, path: '/inbox', component: DemoInboxPage, validateSearch: ownSearch(parseInboxSearch) }),
  createRoute({ getParentRoute: () => demoSpace, path: '/inbox/$noticeId', component: DemoInboxPage, validateSearch: ownSearch(parseInboxSearch) }),
];
const demoSpaceRoutes = [
  // A workspace opens on its home, 전체: the project page over every project (D-065).
  createRoute({ getParentRoute: () => demoSpace, path: '/', component: DemoProjectPage, validateSearch: ownSearch(parseIssueSearch) }),
  ...demoInboxRoutes,
  createRoute({ getParentRoute: () => demoSpace, path: '/members', component: DemoMembersPage, validateSearch: ownSearch(parseMembersSearch) }),
  createRoute({ getParentRoute: () => demoSpace, path: '/documents', component: DemoDocumentsPage }),
  createRoute({ getParentRoute: () => demoSpace, path: '/projects', component: DemoProjectsPage, validateSearch: ownSearch(parseProjectsSearch) }),
  // 워크스페이스 설정 turns the menu into the workspace's settings: its pages, then each project's (D-061).
  createRoute({ getParentRoute: () => demoSpace, path: '/settings', beforeLoad: ({ params }) => { throw redirect({ href: `/demo/w/${params.workspaceId}/settings/general` }); } }),
  createRoute({ getParentRoute: () => demoSpace, path: '/settings/$section', component: DemoWorkspaceSettingsPage }),
  createRoute({ getParentRoute: () => demoSpace, path: '/settings/projects/$projectId/$section', component: DemoProjectSettingsPage }),
  // A project is one page whose parts are tabs (작업, 백로그, 노트, 결정기록, D-064); its old pages lead to the tabs.
  createRoute({ getParentRoute: () => demoSpace, path: '/p/$projectId', component: DemoProjectPage, validateSearch: ownSearch(parseIssueSearch) }),
  // 새 이슈 at its own address, which the issue pages open in a modal (D-070); 편집 is the form page.
  createRoute({ getParentRoute: () => demoSpace, path: '/issues/new', component: DemoNewIssuePage, validateSearch: ownSearch(parseNewIssueSearch) }),
  createRoute({ getParentRoute: () => demoSpace, path: '/p/$projectId/work-items/new', component: DemoNewIssuePage, validateSearch: ownSearch(parseNewIssueSearch) }),
  createRoute({ getParentRoute: () => demoSpace, path: '/p/$projectId/work-items/$workItemId/edit', component: DemoFormPage }),
  createRoute({ getParentRoute: () => demoSpace, path: '/p/$projectId/work-items/$workItemId', component: DemoDetailPage, validateSearch: ownSearch(parseIssueSearch) }),
  createRoute({ getParentRoute: () => demoSpace, path: '/p/$projectId/decisions', beforeLoad: ({ params }) => { throw redirect({ href: `/demo/w/${params.workspaceId}/p/${params.projectId}?v=${params.workspaceId}-decisions` }); } }),
  createRoute({ getParentRoute: () => demoSpace, path: '/p/$projectId/sessions', beforeLoad: ({ params }) => { throw redirect({ href: `/demo/w/${params.workspaceId}/p/${params.projectId}?v=${params.workspaceId}-notes` }); } }),
  createRoute({ getParentRoute: () => demoSpace, path: '/p/$projectId/artifacts', beforeLoad: ({ params }) => { throw redirect({ href: `/demo/w/${params.workspaceId}/documents` }); } }),
  createRoute({ getParentRoute: () => demoSpace, path: '/p/$projectId/settings', beforeLoad: ({ params }) => { throw redirect({ href: `/demo/w/${params.workspaceId}/settings/projects/${params.projectId}/general` }); } }),
] as const;
const demoRoutes = [
  demoStart,
  createRoute({ getParentRoute: () => demo, path: '/workspaces', component: DemoWorkspacesPage }),
  // The member's own settings (the profile card's gear), outside any workspace as the real /settings/….
  createRoute({ getParentRoute: () => demo, path: '/settings/profile', component: DemoProfilePage }),
  createRoute({ getParentRoute: () => demo, path: '/settings/appearance', component: DemoAppearancePage }),
  createRoute({ getParentRoute: () => demo, path: '/settings/notifications', component: DemoNotificationsPage }),
  createRoute({ getParentRoute: () => demo, path: '/settings/api-keys', component: DemoApiKeysPage }),
  createRoute({ getParentRoute: () => demo, path: '/settings/security', component: DemoSecurityPage }),
  // The instance's settings, for its administrators, outside any workspace as the real /admin/….
  createRoute({ getParentRoute: () => demo, path: '/admin/$section', component: DemoAdminPage }),
  demoSpace.addChildren(demoSpaceRoutes),
  createRoute({ getParentRoute: () => demo, path: '/patterns/states', component: DemoStatesPage, validateSearch: ownSearch(parseStatesSearch) }),
  createRoute({ getParentRoute: () => demo, path: '/patterns/dialogs', component: DemoDialogsPage }),
] as const;
const demoTree = import.meta.env.DEV ? [demo.addChildren(demoRoutes)] : [];
export const router = createRouter({ routeTree: rootRoute.addChildren([...demoTree, workspace.addChildren([start, chooser, scoped.addChildren([home, inbox, myTasks, members, documents, settings, projects, projectItems, projectSettings, itemDetail, itemReference]), security, keys, appearance, ...legacy]), login, setup, join, forcedPassword]), defaultPreload: 'intent', scrollRestoration: true,
  // A panel opened over a screen shows the page's own address (a masked move); reloaded, the address is that page (D-069).
  unmaskOnReload: true });
setUnauthorizedHandler(() => { resetCsrf(); void queryClient.cancelQueries().then(() => { queryClient.clear(); void router.navigate({ to: '/login' }); }); });
followHistory(router.history);
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
