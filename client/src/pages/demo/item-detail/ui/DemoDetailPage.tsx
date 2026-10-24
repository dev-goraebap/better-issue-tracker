import { useParams, useSearch } from '@tanstack/react-router';
import { IssueDetail } from '@/widgets/demo-issue-detail';

/**
 * PATTERN · 상세, /demo/w/$workspaceId/p/$projectId/work-items/$workItemId. Copy this page for one item read on its own
 * address that the list also opens in a modal (D-069): the same widget (IssueDetail) draws both, through Surface. This
 * page is what the address is when it is reloaded, opened from a link or reached on a phone, or by 크게 보기 in the modal.
 */
export function DemoDetailPage() {
  const { workspaceId, projectId, workItemId } = useParams({ from: '/demo/w/$workspaceId/p/$projectId/work-items/$workItemId' });
  const search = useSearch({ from: '/demo/w/$workspaceId/p/$projectId/work-items/$workItemId' });
  return <IssueDetail workspaceId={workspaceId} projectId={projectId} id={workItemId} search={search} />;
}
