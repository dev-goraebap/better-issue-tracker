import { useParams, useSearch } from '@tanstack/react-router';
import type { NewIssueSearch } from '@/entities/work-item';
import { NewIssue } from '@/widgets/issue-editor';

/**
 * PATTERN · 새 항목 (마스크 라우트), /w/$workspaceId/p/$projectId/work-items/new and /w/$workspaceId/issues/new (D-070).
 * A quick form the list opens in a modal at the form's own address: the same widget (NewIssue) draws both. This page is
 * what the address is when it is reloaded, opened from a link or reached on a phone, or by 크게 보기 in the modal.
 */
export function NewIssuePage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId?: string };
  const search = useSearch({ strict: false }) as NewIssueSearch;
  return <NewIssue workspaceId={workspaceId} projectId={projectId} status={search.status} />;
}
