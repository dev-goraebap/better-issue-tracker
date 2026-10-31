import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { ApiError, bootstrapQueryOptions, capabilitiesQueryOptions, keyQueryOptions, resetCsrf, sessionQueryOptions, setUnauthorizedHandler } from '@/shared/api';
import { followHistory } from '@/shared/lib/history-trail';
import { isId, ownSearch } from '@/shared/lib/route-search';
import { navigationQuery, favoritesQuery } from '@/entities/navigation';
import { ProjectMembersPage, loadProjectMembers } from '@/pages/project/members';
import { projectKey, projectQuery, projectsQuery } from '@/entities/project';
import { itemQuery, byRefQuery, parseWorkItemSearch, parseNewWorkItemSearch } from '@/entities/work-item';
import { workspaceKey, workspacePagesQuery, workspaceQuery, workspacesQuery } from '@/entities/workspace';
import { BootstrapPage } from '@/pages/entry/bootstrap';
import { ChangePasswordPage } from '@/pages/entry/change-password';
import { captureJoinEntry, JoinPage } from '@/pages/entry/join';
import { LoginPage } from '@/pages/entry/login';
import { NotFoundPage } from '@/pages/entry/not-found';
import { WorkspacesPage } from '@/pages/entry/workspaces';
import { WorkItemPage, loadWorkItem } from '@/pages/project/work-item';
import { ApiKeysPage } from '@/pages/settings/api-keys';
import { AppearancePage } from '@/pages/settings/appearance';
import { ProfilePage } from '@/pages/settings/profile';
import { ProjectSettingsPage } from '@/pages/settings/project';
import { SecurityPage } from '@/pages/settings/security';
import { loadWorkspaceSettings, WorkspaceSettingsPage } from '@/pages/settings/workspace';
import { DocumentsPage } from '@/pages/workspace/documents';
import { DocumentPage, loadDocument, parseDocumentSearch } from '@/pages/workspace/document';
import { NewDocumentPage } from '@/pages/workspace/document-new';
import { ProjectDocumentsPage } from '@/pages/project/documents';
import { ManualsPage, parseManualSearch } from '@/pages/project/manuals';
import { parseFolderSearch, parseNewDocumentSearch } from '@/entities/document';
import { InboxPage, parseInboxSearch } from '@/pages/workspace/inbox';
import { NewWorkItemPage } from '@/pages/workspace/work-item-new';
import { WorkItemsPage, loadWorkItems } from '@/pages/workspace/work-items';
import { loadMembers, MembersPage, parseMembersSearch } from '@/pages/workspace/members';
import { InvitePage } from '@/pages/workspace/members-invite';
import { loadProjects, parseProjectsSearch, ProjectsPage } from '@/pages/workspace/projects';
import { AppLayout } from '../layout/AppLayout';
import { RootLayout } from '../layout/RootLayout';
import { RouteError } from '../layout/RouteError';
import { queryClient } from '../model/query-client';
import { routeRead } from '../model/route-read';

/**
 * How long a guard trusts the session and the workspace it just read: a quick run of clicks does not ask again before
 * each move (a request the server refuses later still signs the member out through the 401 handler).
 */
const GUARD_FRESH_MS = 15_000;

captureJoinEntry();

async function requireSession() {
  const session = await routeRead(() => queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: GUARD_FRESH_MS }));
  if (!session) {
    await queryClient.cancelQueries(); queryClient.clear(); resetCsrf();
    const status = await routeRead(() => queryClient.fetchQuery(bootstrapQueryOptions));
    throw redirect({ to: status.canBootstrap ? '/setup' : '/login' });
  }
  return session;
}
async function entryGuard(isSetup: boolean) {
  const session = await routeRead(() => queryClient.fetchQuery(sessionQueryOptions));
  if (session) throw redirect({ to: session.mustChangePassword ? '/change-password' : '/' });
  const status = await routeRead(() => queryClient.fetchQuery(bootstrapQueryOptions));
  if (status.canBootstrap !== isSetup) throw redirect({ to: status.canBootstrap ? '/setup' : '/login' });
}
/** Where a visit with no workspace in its address goes: the session's workspace, the only one, or the chooser. */
async function resume(suffix = '') {
  const session = await requireSession();
  if (session.mustChangePassword) throw redirect({ to: '/change-password' });
  const activeWorkspaceId = session.activeWorkspaceId;
  if (activeWorkspaceId) {
    try { await routeRead(() => queryClient.fetchQuery(workspaceQuery(activeWorkspaceId))); throw redirect({ href: `/workspaces/${activeWorkspaceId}${suffix}` }); }
    catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; }
  }
  const spaces = await routeRead(() => queryClient.fetchQuery(workspacesQuery()));
  if (spaces.items.length === 1 && !spaces.nextCursor) throw redirect({ href: `/workspaces/${spaces.items[0]!.id}${suffix}` });
  throw redirect({ to: '/workspaces' });
}
/** A project the address names, or back to the workspace's projects when it is gone. */
async function loadProject(w: string, p: string) {
  try { await routeRead(() => queryClient.fetchQuery(projectQuery(w, p))); await queryClient.prefetchQuery(navigationQuery(w, p)); }
  catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
    queryClient.removeQueries({ queryKey: projectKey(w, p) });
    throw redirect({ href: `/workspaces/${w}/projects` });
  }
}
/** An address that only leads to another. */
const leadTo = (href: string): never => { throw redirect({ href }); };

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage, errorComponent: RouteError,
  loader: () => queryClient.prefetchQuery(capabilitiesQueryOptions) });

// The signed-in app: everything under it has a session (and not a password it must change first).
const workspace = createRoute({ getParentRoute: () => rootRoute, id: 'workspace', component: AppLayout,
  beforeLoad: async () => { const session = await requireSession(); if (session.mustChangePassword) throw redirect({ to: '/change-password' }); } });
const start = createRoute({ getParentRoute: () => workspace, path: '/', beforeLoad: () => resume() });
const chooser = createRoute({ getParentRoute: () => workspace, path: '/workspaces', component: WorkspacesPage,
  loader: () => queryClient.prefetchInfiniteQuery(workspacePagesQuery()) });

// A workspace the member belongs to; one they lost (404) or an address that names none sends them to choose.
const scoped = createRoute({ getParentRoute: () => workspace, path: '/workspaces/$workspaceId', beforeLoad: async ({ params }) => {
  const id = params.workspaceId;
  if (!isId(id)) throw redirect({ to: '/workspaces' });
  try { await routeRead(() => queryClient.fetchQuery({ ...workspaceQuery(id), staleTime: GUARD_FRESH_MS })); }
  catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
    queryClient.removeQueries({ queryKey: workspaceKey(id) });
    throw redirect({ to: '/workspaces' });
  }
}, loader: ({ params }) => Promise.all([queryClient.prefetchQuery(navigationQuery(params.workspaceId)), queryClient.prefetchQuery(favoritesQuery(params.workspaceId)), queryClient.prefetchInfiniteQuery(projectsQuery(params.workspaceId))]) });
// A workspace opens on its home, 전체: the work items of every project through the workspace's views (D-065, D-066).
const home = createRoute({ getParentRoute: () => scoped, path: '/', beforeLoad: ({ params, location }) => leadTo(`/workspaces/${params.workspaceId}/issues${location.searchStr}`) });
// 새 업무 at its own address, which the work item pages open in a modal (D-070).
const workItemsNew = createRoute({ getParentRoute: () => scoped, path: '/work-items/new', component: NewWorkItemPage, validateSearch: ownSearch(parseNewWorkItemSearch) });
const inbox = createRoute({ getParentRoute: () => scoped, path: '/inbox', component: InboxPage, validateSearch: ownSearch(parseInboxSearch) });
// 내 작업 is a view now (담당자 filter, D-066); its old address leads home.
const myTasks = createRoute({ getParentRoute: () => scoped, path: '/my-tasks', beforeLoad: ({ params }) => leadTo(`/workspaces/${params.workspaceId}`) });
const members = createRoute({ getParentRoute: () => scoped, path: '/members', component: MembersPage, validateSearch: ownSearch(parseMembersSearch),
  loader: ({ params }) => loadMembers(queryClient, params.workspaceId) });
// 구성원 초대 is a page of rows, as 호호 HR's 사원 등록 (D-079).
const membersInvite = createRoute({ getParentRoute: () => scoped, path: '/members/invite', component: InvitePage });
// 문서함 and its documents (D-093): a document at /documents/<제목>-<id>, 새 문서 at its own address.
const documents = createRoute({ getParentRoute: () => scoped, path: '/documents', beforeLoad: ({ params, location }) => leadTo(`/workspaces/${params.workspaceId}/resources${location.searchStr}`) });
const documentNew = createRoute({ getParentRoute: () => scoped, path: '/documents/new', component: NewDocumentPage, validateSearch: ownSearch(parseNewDocumentSearch) });
const documentDetail = createRoute({ getParentRoute: () => scoped, path: '/documents/$documentRef', component: DocumentPage, validateSearch: ownSearch(parseDocumentSearch),
  loaderDeps: ({ search }) => ({ v: search.v }), loader: ({ params, deps }) => loadDocument(queryClient, params.workspaceId, params.documentRef, deps) });
// The edit pages are gone (D-107): a document is written on its own page, so an old /edit address opens it.
const documentEdit = createRoute({ getParentRoute: () => scoped, path: '/documents/$documentRef/edit',
  beforeLoad: ({ params }) => leadTo(`/workspaces/${params.workspaceId}/documents/${params.documentRef}`) });
// A project's 문서 is 문서함's folder of it opened at once.
const projectDocuments = createRoute({ getParentRoute: () => scoped, path: '/projects/$projectId/documents', beforeLoad: ({ params, location }) => leadTo(`/workspaces/${params.workspaceId}/projects/${params.projectId}/resources${location.searchStr}`),
  validateSearch: ownSearch(parseFolderSearch), loader: ({ params }) => loadProject(params.workspaceId, params.projectId) });
const manualPreview = createRoute({ getParentRoute: () => scoped, path: '/projects/$projectId/manuals', component: ManualsPage,
  validateSearch: ownSearch(parseManualSearch), loader: async ({ params }) => {
    await Promise.all([loadProject(params.workspaceId, params.projectId), queryClient.prefetchInfiniteQuery(projectsQuery(params.workspaceId))]);
  } });
const projects = createRoute({ getParentRoute: () => scoped, path: '/projects', component: ProjectsPage, validateSearch: ownSearch(parseProjectsSearch),
  loaderDeps: ({ search }) => search, loader: ({ params, deps }) => loadProjects(queryClient, params.workspaceId, deps) });

// A project is one page of its work items (D-066); a work item opens at its own address, written there (D-107).
const projectItems = createRoute({ getParentRoute: () => scoped, path: '/projects/$projectId', beforeLoad: ({ params, location }) => leadTo(`/workspaces/${params.workspaceId}/projects/${params.projectId}/issues${location.searchStr}`) });
const itemNew = createRoute({ getParentRoute: () => scoped, path: '/projects/$projectId/work-items/new', component: NewWorkItemPage, validateSearch: ownSearch(parseNewWorkItemSearch),
  loader: ({ params }) => loadProject(params.workspaceId, params.projectId) });
const itemDetail = createRoute({ getParentRoute: () => scoped, path: '/projects/$projectId/work-items/$workItemId', component: WorkItemPage, validateSearch: ownSearch(parseWorkItemSearch),
  loader: async ({ params }) => { await loadProject(params.workspaceId, params.projectId); await loadWorkItem(queryClient, params.workspaceId, params.projectId, params.workItemId); } });
const itemEdit = createRoute({ getParentRoute: () => scoped, path: '/projects/$projectId/work-items/$workItemId/edit',
  beforeLoad: ({ params }) => leadTo(`/workspaces/${params.workspaceId}/projects/${params.projectId}/work-items/${params.workItemId}`) });
// A key such as BIT-42 (an agent's or a commit's reference) leads to its work item; /work-items/new above wins over it.
const workspaceItem = createRoute({ getParentRoute: () => scoped, path: '/work-items/id/$workItemId', component: WorkItemPage, validateSearch: ownSearch(parseWorkItemSearch),
  loader: async ({ params }) => {
    const item = await routeRead(() => queryClient.fetchQuery(itemQuery(params.workspaceId, '', params.workItemId)));
    if (item.projectId) return leadTo(`/workspaces/${params.workspaceId}/projects/${item.projectId}/work-items/${item.id}`);
  } });
const workspaceItemEdit = createRoute({ getParentRoute: () => scoped, path: '/work-items/id/$workItemId/edit',
  beforeLoad: ({ params }) => leadTo(`/workspaces/${params.workspaceId}/work-items/id/${params.workItemId}`) });
const itemReference = createRoute({ getParentRoute: () => scoped, path: '/work-items/$reference', loader: async ({ params }) => {
  const item = await routeRead(() => queryClient.fetchQuery(byRefQuery(params.workspaceId, params.reference)));
  return leadTo(item.projectId ? `/workspaces/${params.workspaceId}/projects/${item.projectId}/work-items/${item.id}` : `/workspaces/${params.workspaceId}/work-items/id/${item.id}`);
} });

// 워크스페이스 설정 turns the menu into the workspace's settings: its pages, then each project's (D-061).
const settingsStart = createRoute({ getParentRoute: () => scoped, path: '/settings', beforeLoad: ({ params }) => leadTo(`/workspaces/${params.workspaceId}/settings/general`) });
const settings = createRoute({ getParentRoute: () => scoped, path: '/settings/$section', component: WorkspaceSettingsPage,
  loader: ({ params }) => loadWorkspaceSettings(queryClient, params.workspaceId, params.section) });
const projectSettingsStart = createRoute({ getParentRoute: () => scoped, path: '/settings/projects/$projectId',
  beforeLoad: ({ params }) => leadTo(`/workspaces/${params.workspaceId}/settings/projects/${params.projectId}/general`) });
const projectSettings = createRoute({ getParentRoute: () => scoped, path: '/settings/projects/$projectId/$section', component: ProjectSettingsPage,
  loader: ({ params }) => loadProject(params.workspaceId, params.projectId) });
const oldProjectSettings = createRoute({ getParentRoute: () => scoped, path: '/projects/$projectId/settings',
  beforeLoad: ({ params }) => leadTo(`/workspaces/${params.workspaceId}/settings/projects/${params.projectId}/general`) });

// The member's own settings, outside any workspace.
const profile = createRoute({ getParentRoute: () => workspace, path: '/settings/profile', component: ProfilePage });
const security = createRoute({ getParentRoute: () => workspace, path: '/settings/security', component: SecurityPage });
const appearance = createRoute({ getParentRoute: () => workspace, path: '/settings/appearance', component: AppearancePage });
const keys = createRoute({ getParentRoute: () => workspace, path: '/settings/api-keys', component: ApiKeysPage,
  loader: () => queryClient.prefetchInfiniteQuery(keyQueryOptions) });
// Addresses from before workspaces were in the address lead to the same page in the member's workspace.
const legacy = ['/inbox', '/my-tasks', '/members', '/documents'].map(path => createRoute({ getParentRoute: () => workspace, path, beforeLoad: () => resume(path) }));
// The short addresses before D-084 (/w/…/p/…/work-items/…, /w/…/r/BIT-42) lead to the same page under the plural ones.
const shortAddress = createRoute({ getParentRoute: () => workspace, path: '/w/$', beforeLoad: ({ location }) => leadTo(location.href
  .replace(/^\/w\//, '/workspaces/').replace(/\/p\/([^/?#]+)/, '/projects/$1').replace(/\/r\/([^/?#]+)/, '/work-items/$1')) });
// The addresses before D-091 (…/issues/…, as repository issues mirrored before it still link) lead to …/work-items/….
const issueAddresses = ['/issues/$reference', '/projects/$projectId/issues/$workItemId'].map(path => createRoute({ getParentRoute: () => scoped, path,
  beforeLoad: ({ location }) => leadTo(location.href.replace('/issues/', '/work-items/')) }));

const scopePages = [false, true].flatMap(project => {
  const prefix = project ? '/projects/$projectId' : '';
  return [
    ...['issues', 'schedules'].map(section => createRoute({ getParentRoute: () => scoped, path: `${prefix}/${section}`, component: WorkItemsPage,
      validateSearch: ownSearch(parseWorkItemSearch), loader: async ({ params }) => { const p = 'projectId' in params ? params.projectId : undefined; if (p) await loadProject(params.workspaceId, p); await loadWorkItems(queryClient, params.workspaceId, p); } })),
    createRoute({ getParentRoute: () => scoped, path: `${prefix}/resources`, component: project ? ProjectDocumentsPage : DocumentsPage,
      validateSearch: ownSearch(parseFolderSearch), loader: ({ params }) => 'projectId' in params ? loadProject(params.workspaceId, params.projectId) : undefined }),
  ];
});
const workspaceManuals = createRoute({ getParentRoute: () => scoped, path: '/manuals', component: ManualsPage, validateSearch: ownSearch(parseManualSearch),
  loader: ({ params }) => queryClient.prefetchInfiniteQuery(projectsQuery(params.workspaceId)) });
const projectMembers = createRoute({ getParentRoute: () => scoped, path: '/projects/$projectId/members', component: ProjectMembersPage,
  loader: async ({ params }) => { await loadProject(params.workspaceId, params.projectId); await loadProjectMembers(queryClient, params.workspaceId); } });
const focusedSettings = createRoute({ getParentRoute: () => scoped, path: '/projects/$projectId/settings/$section', component: ProjectSettingsPage,
  loader: async ({ params }) => { await loadProject(params.workspaceId, params.projectId); await queryClient.prefetchQuery(navigationQuery(params.workspaceId, params.projectId)); } });

// The entry screens, outside the app's frame.
const login = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage, beforeLoad: () => entryGuard(false) });
const setup = createRoute({ getParentRoute: () => rootRoute, path: '/setup', component: BootstrapPage, beforeLoad: () => entryGuard(true) });
const join = createRoute({ getParentRoute: () => rootRoute, path: '/join', component: JoinPage });
const forcedPassword = createRoute({ getParentRoute: () => rootRoute, path: '/change-password', component: ChangePasswordPage,
  beforeLoad: async () => { const session = await requireSession(); if (!session.mustChangePassword) throw redirect({ to: '/settings/security' }); } });

const routeTree = rootRoute.addChildren([
  workspace.addChildren([
    start, chooser,
    scoped.addChildren([
      home, ...scopePages, projectMembers, focusedSettings, workItemsNew, inbox, myTasks, members, membersInvite, documents, documentNew, documentDetail, documentEdit, projects, projectDocuments,
      projectItems, itemNew, itemDetail, itemEdit, workspaceItem, workspaceItemEdit, itemReference, ...issueAddresses,
      ...(import.meta.env.DEV ? [manualPreview, workspaceManuals] : []),
      settingsStart, settings, projectSettingsStart, projectSettings, oldProjectSettings,
    ]),
    profile, security, keys, appearance, ...legacy, shortAddress,
  ]),
  login, setup, join, forcedPassword,
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true,
  // A panel opened over a screen shows the page's own address (a masked move); reloaded, the address is that page (D-069).
  unmaskOnReload: true });
setUnauthorizedHandler(() => { resetCsrf(); void queryClient.cancelQueries().then(() => { queryClient.clear(); void router.navigate({ to: '/login' }); }); });
followHistory(router.history);
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
