import type { AnchorHTMLAttributes } from 'react';
import { Link } from '@tanstack/react-router';
import type { Issue } from '../api/issue';
import type { IssueSearch } from '../model/search';

/**
 * A link to an issue's page that carries the list's conditions (search), so the way back returns to the same list; the
 * issue pages open it in their modal instead (D-069). Anything else an anchor takes (a class, a role, data attributes, pointer and key handlers)
 * passes through.
 */
export function IssueLink({ workspaceId, item, search, ...anchor }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  workspaceId: string; item: Pick<Issue, 'id' | 'projectId'>; search?: IssueSearch; [data: `data-${string}`]: string | boolean | undefined;
}) {
  return <Link to="/workspaces/$workspaceId/projects/$projectId/issues/$issueId" params={{ workspaceId, projectId: item.projectId, issueId: item.id }} search={search ?? {}} {...anchor} />;
}
