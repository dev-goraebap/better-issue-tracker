import { useQuery } from '@tanstack/react-query';
import { useParams, useSearch } from '@tanstack/react-router';
import { projectQuery } from '@/entities/project';
import { DocumentFolder } from '@/widgets/document-folder';

/**
 * A project's 문서, /workspaces/$workspaceId/projects/$projectId/documents (D-093, BIT-41): 문서함's folder of the
 * project opened at once, ?folder= one of its folders.
 */
export function ProjectDocumentsPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId: string };
  const { folder } = useSearch({ strict: false }) as { folder?: string };
  const project = useQuery(projectQuery(workspaceId, projectId)).data;
  return <DocumentFolder key={folder ?? 'top'} workspaceId={workspaceId} projectId={projectId} folderId={folder} title="문서" rootLabel={project?.name ?? '문서'} />;
}
