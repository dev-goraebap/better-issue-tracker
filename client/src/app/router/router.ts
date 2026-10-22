import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { HomePage } from '@/pages/workspace/home';
import { InboxPage } from '@/pages/workspace/inbox';
import { MyTasksPage } from '@/pages/workspace/my-tasks';
import { MembersPage } from '@/pages/workspace/members';
import { DocumentsPage } from '@/pages/workspace/documents';
import { NotFoundPage } from '@/pages/entry/not-found';
import { LoginPage } from '@/pages/entry/login';
import { BootstrapPage } from '@/pages/entry/bootstrap';
import { ChangePasswordPage } from '@/pages/entry/change-password';
import { SecurityPage } from '@/pages/settings/security';
import { ApiKeysPage } from '@/pages/settings/api-keys';
import { bootstrapQueryOptions, capabilitiesQueryOptions, keyQueryOptions, resetCsrf, sessionQueryOptions, setUnauthorizedHandler } from '@/shared/api';
import { RootLayout } from '../layout/RootLayout';
import { RouteError } from '../layout/RouteError';
import { WorkspaceLayout } from '../layout/WorkspaceLayout';
import { queryClient } from '../model/query-client';

async function requireSession() {
  const session = await queryClient.fetchQuery(sessionQueryOptions);
  if (!session) {
    await queryClient.cancelQueries(); queryClient.clear(); resetCsrf();
    const status = await queryClient.fetchQuery(bootstrapQueryOptions);
    throw redirect({ to: status.canBootstrap ? '/setup' : '/login' });
  }
  return session;
}
async function entryGuard(setup: boolean) {
  const session = await queryClient.fetchQuery(sessionQueryOptions);
  if (session) throw redirect({ to: session.mustChangePassword ? '/change-password' : '/' });
  const status = await queryClient.fetchQuery(bootstrapQueryOptions);
  if (status.canBootstrap !== setup) throw redirect({ to: status.canBootstrap ? '/setup' : '/login' });
}
const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage, errorComponent: RouteError,
  loader: () => queryClient.prefetchQuery(capabilitiesQueryOptions) });
const workspace = createRoute({ getParentRoute: () => rootRoute, id: 'workspace', component: WorkspaceLayout,
  beforeLoad: async () => { const session = await requireSession(); if (session.mustChangePassword) throw redirect({ to: '/change-password' }); } });
const home = createRoute({ getParentRoute: () => workspace, path: '/', component: HomePage });
const inbox = createRoute({ getParentRoute: () => workspace, path: '/inbox', component: InboxPage });
const myTasks = createRoute({ getParentRoute: () => workspace, path: '/my-tasks', component: MyTasksPage });
const members = createRoute({ getParentRoute: () => workspace, path: '/members', component: MembersPage });
const documents = createRoute({ getParentRoute: () => workspace, path: '/documents', component: DocumentsPage });
const security = createRoute({ getParentRoute: () => workspace, path: '/settings/security', component: SecurityPage });
const keys = createRoute({ getParentRoute: () => workspace, path: '/settings/api-keys', component: ApiKeysPage,
  validateSearch: (search: Record<string, unknown>): { cursor?: string } => ({ cursor: typeof search.cursor === 'string' ? search.cursor : undefined }),
  loaderDeps: ({ search }) => ({ cursor: search.cursor }), loader: async ({ deps }) => { await queryClient.ensureQueryData(keyQueryOptions(deps.cursor)); } });
const login = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage, beforeLoad: () => entryGuard(false) });
const setup = createRoute({ getParentRoute: () => rootRoute, path: '/setup', component: BootstrapPage, beforeLoad: () => entryGuard(true) });
const forcedPassword = createRoute({ getParentRoute: () => rootRoute, path: '/change-password', component: ChangePasswordPage,
  beforeLoad: async () => { const session = await requireSession(); if (!session.mustChangePassword) throw redirect({ to: '/settings/security' }); } });
export const router = createRouter({
  routeTree: rootRoute.addChildren([workspace.addChildren([home, inbox, myTasks, members, documents, security, keys]), login, setup, forcedPassword]),
  defaultPreload: 'intent', scrollRestoration: true,
});
setUnauthorizedHandler(() => {
  resetCsrf(); void queryClient.cancelQueries().then(() => { queryClient.clear(); void router.navigate({ to: '/login' }); });
});
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
