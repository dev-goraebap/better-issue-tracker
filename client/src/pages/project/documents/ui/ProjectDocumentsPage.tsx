import { useParams, useSearch } from '@tanstack/react-router';
import { DocumentFolder } from '@/widgets/document-folder';

/**
 * A project's 문서, /workspaces/$workspaceId/projects/$projectId/documents (D-093, BIT-41): 문서함's folder of the
 * project opened at once, ?folder= one of its folders.
 */
export function ProjectDocumentsPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId: string };
  const { folder } = useSearch({ strict: false }) as { folder?: string };
  return <DocumentFolder key={`${projectId}-${folder ?? 'top'}`} workspaceId={workspaceId} projectId={projectId} folderId={folder} title="문서" rootLabel="문서" />;
}
