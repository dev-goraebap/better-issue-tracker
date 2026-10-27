import type { AnchorHTMLAttributes } from 'react';
import { Link } from '@tanstack/react-router';
import type { WorkItem } from '../api/work-item';
import type { WorkItemSearch } from '../model/search';

/**
 * A link to a work item's page that carries the list's conditions (search), so the way back returns to the same list; the
 * work item pages open it in their modal instead (D-069). Anything else an anchor takes (a class, a role, data attributes, pointer and key handlers)
 * passes through.
 */
export function WorkItemLink({ workspaceId, item, search, ...anchor }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  workspaceId: string; item: Pick<WorkItem, 'id' | 'projectId'>; search?: WorkItemSearch; [data: `data-${string}`]: string | boolean | undefined;
}) {
  if (!item.projectId) return <Link to="/workspaces/$workspaceId/work-items/id/$workItemId" params={{ workspaceId, workItemId: item.id }} search={search ?? {}} {...anchor} />;
  return <Link to="/workspaces/$workspaceId/projects/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} search={search ?? {}} {...anchor} />;
}
