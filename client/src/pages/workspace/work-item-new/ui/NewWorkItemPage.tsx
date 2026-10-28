import { useParams, useSearch } from '@tanstack/react-router';
import type { NewWorkItemSearch } from '@/entities/work-item';
import { NewWorkItem } from '@/widgets/work-item-editor';

/**
 * PATTERN · 새 항목 (마스크 라우트), /workspaces/$workspaceId/projects/$projectId/work-items/new and /workspaces/$workspaceId/work-items/new (D-070).
 * A quick form the list opens in a modal at the form's own address: the same widget (NewWorkItem) draws both. This page is
 * what the address is when it is reloaded, opened from a link or reached on a phone, or by 크게 보기 in the modal.
 */
export function NewWorkItemPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId?: string };
  const search = useSearch({ strict: false }) as NewWorkItemSearch;
  return <NewWorkItem workspaceId={workspaceId} projectId={projectId} status={search.status} kind={search.kind ?? 'task'} typeId={search.type} />;
}
