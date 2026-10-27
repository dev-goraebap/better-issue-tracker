import type { QueryClient } from '@tanstack/react-query';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { itemQuery } from '@/entities/work-item';

/** What a work item's page (and its edit form) shows first: the work item, its project's columns and the labels. */
export function loadWorkItem(client: QueryClient, workspaceId: string, projectId: string, workItemId: string) {
  return Promise.all([
    client.prefetchQuery(itemQuery(workspaceId, projectId, workItemId)),
    projectId ? client.prefetchQuery(columnsQuery(workspaceId, projectId)) : Promise.resolve(),
    client.prefetchQuery(labelsQuery(workspaceId)),
  ]);
}
