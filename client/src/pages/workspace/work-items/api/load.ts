import type { QueryClient } from '@tanstack/react-query';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { memberPagesQuery } from '@/entities/workspace';
import { scopeItemsQuery, tweaksQuery, viewOrdersQuery, viewsQuery } from '@/entities/work-item';

/** What 홈 or a project's work item page shows first: the scope's first page of work items, the views, their orders and tweaks, labels, members, the columns. */
export function loadWorkItems(client: QueryClient, workspaceId: string, projectId?: string) {
  return Promise.all([
    client.prefetchInfiniteQuery(scopeItemsQuery(workspaceId, projectId)),
    client.prefetchQuery(viewsQuery(workspaceId)),
    client.prefetchQuery(tweaksQuery(workspaceId)),
    client.prefetchQuery(viewOrdersQuery(workspaceId)),
    client.prefetchQuery(labelsQuery(workspaceId)),
    client.prefetchInfiniteQuery(memberPagesQuery(workspaceId)),
    ...(projectId ? [client.prefetchQuery(columnsQuery(workspaceId, projectId))] : []),
  ]);
}
