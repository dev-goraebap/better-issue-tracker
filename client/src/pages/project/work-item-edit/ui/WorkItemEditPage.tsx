import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { BackLink, PageFrame, QueryMessage } from '@/shared/ui';
import { itemQuery } from '@/entities/work-item';
import { EditForm } from './EditForm';

/**
 * PATTERN · 작성 양식, /workspaces/$workspaceId/projects/$projectId/work-items/$workItemId/edit. Editing one item's words on its own
 * address (not in a dialog): the title, the description and the properties, the work item's detail only reading them
 * (BIT-22); making one is 새 업무 at its own address (NewWorkItem, D-070), whose page this one is drawn as.
 *
 * - PageFrame width="narrow" with back: a phone gives the form the whole screen, no tab bar.
 * - The foot row is PageFoot: 취소 at its start, 저장 at its end, pointing at the form by id (form={formId}).
 * - Errors appear on submit, on the field that has them; a change someone saved first (409) is said under the form.
 */
export function WorkItemEditPage() {
  const { workspaceId, projectId, workItemId } = useParams({ strict: false }) as { workspaceId: string; projectId: string; workItemId: string };
  const result = useQuery(itemQuery(workspaceId, projectId ?? '', workItemId));
  const back = !projectId ? <BackLink to="/workspaces/$workspaceId/work-items/id/$workItemId" params={{ workspaceId, workItemId }} label="업무" /> : <BackLink to="/workspaces/$workspaceId/projects/$projectId/work-items/$workItemId" params={{ workspaceId, projectId, workItemId }} label="업무" />;
  if (!result.data) return <PageFrame title="업무 편집" width="narrow" back={back}>
    <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
  </PageFrame>;
  return <EditForm key={result.data.id} item={result.data} back={back} />;
}
