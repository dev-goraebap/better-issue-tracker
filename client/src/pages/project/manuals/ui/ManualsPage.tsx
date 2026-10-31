import { useParams } from '@tanstack/react-router';
import { ManualPreview } from './ManualPreview';

/** Local design review only, registered by the router exclusively in development mode. */
export function ManualsPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId: string };
  return <ManualPreview key={`${workspaceId}.${projectId}`} workspaceId={workspaceId} projectId={projectId} />;
}
