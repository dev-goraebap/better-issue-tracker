import { useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useParams, useSearch } from '@tanstack/react-router';
import { PageFrame, QueryMessage } from '@/shared/ui';
import { projectsQuery } from '@/entities/project';
import { partsQuery } from '@/entities/document';
import { DocumentFolder } from '@/widgets/document-folder';

/**
 * 리소스, /workspaces/$workspaceId/documents (D-093, BIT-41): every project's folder at the top, then the workspace's
 * own folders and documents (공통). ?folder= opens one of its own folders; a project's folders open on its 문서.
 */
export function DocumentsPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const { folder } = useSearch({ strict: false }) as { folder?: string };
  const result = useInfiniteQuery({ ...projectsQuery(workspaceId), enabled: !folder });
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = result;
  useEffect(() => {
    if (!folder && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [folder, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
  const projects = result.data?.pages.flatMap(page => page.items) ?? [];
  const parts = useQuery({ ...partsQuery(workspaceId, projects.map(project => project.id)), enabled: !folder && projects.length > 0 });
  if (!folder && (!result.data || hasNextPage || (projects.length > 0 && !parts.data))) return <PageFrame title="리소스" icon="documents" chrome="header">
    <QueryMessage pending={result.isPending || result.isFetchingNextPage || parts.isPending} error={result.error ?? parts.error}
      retry={() => { if (isFetchNextPageError) void fetchNextPage(); else { void result.refetch(); if (projects.length > 0) void parts.refetch(); } }} />
  </PageFrame>;
  return <DocumentFolder key={folder ?? 'top'} workspaceId={workspaceId} projectId={null} folderId={folder} title="리소스" rootLabel="리소스"
    projects={projects.map(project => ({ project, part: parts.data?.find(part => part.projectId === project.id) }))} />;
}
