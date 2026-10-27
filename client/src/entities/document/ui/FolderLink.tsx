import type { AnchorHTMLAttributes } from 'react';
import { Link } from '@tanstack/react-router';

/**
 * A link to a folder of a part: the project's 문서 (D-093) or 문서함 for the workspace's own, at its top when no folder.
 * Anything else an anchor takes passes through.
 */
export function FolderLink({ workspaceId, projectId, folderId, ...anchor }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  workspaceId: string; projectId: string | null; folderId?: string | null;
}) {
  const search = folderId ? { folder: folderId } : {};
  return projectId
    ? <Link to="/workspaces/$workspaceId/projects/$projectId/documents" params={{ workspaceId, projectId }} search={search} {...anchor} />
    : <Link to="/workspaces/$workspaceId/documents" params={{ workspaceId }} search={search} {...anchor} />;
}
