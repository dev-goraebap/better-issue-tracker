import type { AnchorHTMLAttributes } from 'react';
import { Link } from '@tanstack/react-router';
import type { WorkItem } from '../api/work-item';
import type { IssueSearch } from '../model/search';

/**
 * A link to an issue's page that carries the list's conditions (search), so the way back returns to the same list; the
 * issue pages open it in their modal instead (D-069). Anything else an anchor takes (a class, a role, drag handlers)
 * passes through.
 */
export function IssueLink({ workspaceId, item, search, ...anchor }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  workspaceId: string; item: Pick<WorkItem, 'id' | 'projectId'>; search?: IssueSearch; 'data-dragging'?: boolean;
}) {
  return <Link to="/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} search={search ?? {}} {...anchor} />;
}
