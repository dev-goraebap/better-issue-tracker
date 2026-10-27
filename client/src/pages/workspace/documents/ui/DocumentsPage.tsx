import { useParams, useSearch } from '@tanstack/react-router';
import { DocumentFolder } from '@/widgets/document-folder';
import { ProjectFolders } from './ProjectFolders';

/**
 * 문서함, /workspaces/$workspaceId/documents (D-093, BIT-41): every project's folder at the top, then the workspace's
 * own folders and documents (공통). ?folder= opens one of its own folders; a project's folders open on its 문서.
 */
export function DocumentsPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const { folder } = useSearch({ strict: false }) as { folder?: string };
  return <DocumentFolder key={folder ?? 'top'} workspaceId={workspaceId} projectId={null} folderId={folder} title="문서함" rootLabel="문서함"
    lead={<ProjectFolders workspaceId={workspaceId} />} />;
}
