import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { HomePage } from '@/pages/workspace/home';
import { InboxPage } from '@/pages/workspace/inbox';
import { MyTasksPage } from '@/pages/workspace/my-tasks';
import { MembersPage } from '@/pages/workspace/members';
import { DocumentsPage } from '@/pages/workspace/documents';
import { NotFoundPage } from '@/pages/entry/not-found';
import { capabilitiesQueryOptions } from '@/shared/api';
import { RootLayout } from '../layout/RootLayout';
import { queryClient } from '../model/query-client';

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  loader: () => queryClient.prefetchQuery(capabilitiesQueryOptions),
});
const home = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const inbox = createRoute({ getParentRoute: () => rootRoute, path: '/inbox', component: InboxPage });
const myTasks = createRoute({ getParentRoute: () => rootRoute, path: '/my-tasks', component: MyTasksPage });
const members = createRoute({ getParentRoute: () => rootRoute, path: '/members', component: MembersPage });
const documents = createRoute({ getParentRoute: () => rootRoute, path: '/documents', component: DocumentsPage });

export const router = createRouter({
  routeTree: rootRoute.addChildren([home, inbox, myTasks, members, documents]),
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
