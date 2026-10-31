import { useParams } from '@tanstack/react-router';
import { ManualWorkspace } from './ManualWorkspace';

/** Shared workspace/project manuals, persisted and authorized by the server. */
export function ManualsPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId?: string };
  return <ManualWorkspace key={`${workspaceId}.${projectId}`} workspaceId={workspaceId} projectId={projectId} />;
}
