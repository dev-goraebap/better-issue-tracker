import type { AnchorHTMLAttributes } from 'react';
import { Link } from '@tanstack/react-router';
import { documentSlug } from '../model/document';

/** A link to a document's page, /documents/<제목>-<id> (D-093); anything else an anchor takes passes through. */
export function DocumentLink({ workspaceId, document, ...anchor }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  workspaceId: string; document: { id: string; title: string };
}) {
  return <Link to="/workspaces/$workspaceId/documents/$documentRef" params={{ workspaceId, documentRef: documentSlug(document) }} {...anchor} />;
}
