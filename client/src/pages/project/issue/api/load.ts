import type { QueryClient } from '@tanstack/react-query';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { itemQuery } from '@/entities/issue';

/** What an issue's page (and its edit form) shows first: the issue, its project's columns and the labels. */
export function loadIssue(client: QueryClient, workspaceId: string, projectId: string, issueId: string) {
  return Promise.all([
    client.prefetchQuery(itemQuery(workspaceId, projectId, issueId)),
    client.prefetchQuery(columnsQuery(workspaceId, projectId)),
    client.prefetchQuery(labelsQuery(workspaceId)),
  ]);
}
