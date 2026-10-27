import { useParams, useSearch } from '@tanstack/react-router';
import type { WorkItemSearch } from '@/entities/work-item';
import { WorkItemDetail } from '@/widgets/work-item-detail';

/**
 * PATTERN · 상세, /workspaces/$workspaceId/projects/$projectId/work-items/$workItemId. One item read on its own address that the list
 * also opens in a modal (D-069): the same widget (WorkItemDetail) draws both, through Surface. This page is what the address
 * is when it is reloaded, opened from a link or reached on a phone, or by 크게 보기 in the modal.
 */
export function WorkItemPage() {
  const { workspaceId, projectId, workItemId } = useParams({ strict: false }) as { workspaceId: string; projectId: string; workItemId: string };
  const search = useSearch({ strict: false }) as WorkItemSearch;
  return <WorkItemDetail key={workItemId} workspaceId={workspaceId} projectId={projectId ?? ''} id={workItemId} search={search} />;
}
