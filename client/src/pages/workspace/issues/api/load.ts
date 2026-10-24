import type { QueryClient } from '@tanstack/react-query';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { memberPagesQuery } from '@/entities/workspace';
import { scopeItemsQuery, tweaksQuery, viewsQuery } from '@/entities/work-item';

/** What 전체 or a project's issue page shows first: the scope's first page of issues, the views and tweaks, labels, members, the columns. */
export function loadIssues(client: QueryClient, workspaceId: string, projectId?: string) {
  return Promise.all([
    client.prefetchInfiniteQuery(scopeItemsQuery(workspaceId, projectId)),
    client.prefetchQuery(viewsQuery(workspaceId)),
    client.prefetchQuery(tweaksQuery(workspaceId)),
    client.prefetchQuery(labelsQuery(workspaceId)),
    client.prefetchInfiniteQuery(memberPagesQuery(workspaceId)),
    ...(projectId ? [client.prefetchQuery(columnsQuery(workspaceId, projectId))] : []),
  ]);
}
