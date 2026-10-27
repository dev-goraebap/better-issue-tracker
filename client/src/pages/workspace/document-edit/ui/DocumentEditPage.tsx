import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { BackLink, PageFrame, QueryMessage } from '@/shared/ui';
import { documentHref, documentIdOf, documentQuery, refreshDocuments, updateDocument } from '@/entities/document';
import { DocumentForm, type DocumentDraft } from '@/widgets/document-editor';

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(each => b.includes(each));

/**
 * A document opened to edit, /workspaces/$workspaceId/documents/$documentRef/edit (BIT-41): only what changed is sent,
 * over the version it opened with, so a save someone made since is a conflict said under the form.
 */
export function DocumentEditPage() {
  const { workspaceId, documentRef } = useParams({ strict: false }) as { workspaceId: string; documentRef: string };
  const client = useQueryClient();
  const navigate = useNavigate();
  const result = useQuery(documentQuery(workspaceId, documentIdOf(documentRef)));
  const back = <BackLink to="/workspaces/$workspaceId/documents/$documentRef" params={{ workspaceId, documentRef }} label="문서" />;
  const document = result.data;
  if (!document) return <PageFrame title="문서 편집" width="narrow" back={back}>
    <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
  </PageFrame>;
  const opened: DocumentDraft = { title: document.title, body: document.body, labelIds: document.labelIds };
  const leave = (href = documentHref(workspaceId, document)) => void navigate({ href, replace: true });
  const save = async (draft: DocumentDraft) => {
    try {
      await updateDocument(workspaceId, document.id, {
        expectedVersion: document.version,
        ...(draft.title !== opened.title ? { title: draft.title } : {}),
        ...(draft.body !== opened.body ? { body: draft.body } : {}),
        ...(!same(draft.labelIds, opened.labelIds) ? { labelIds: draft.labelIds } : {}),
      });
    } catch (failure) { return authError(failure); }
    await refreshDocuments(client, workspaceId);
    leave(documentHref(workspaceId, { id: document.id, title: draft.title }));
    return undefined;
  };
  return <DocumentForm key={document.id} workspaceId={workspaceId} title="문서 편집" back={back} initial={opened} saveLabel="저장"
    place={document.path.length > 0 ? document.path.map(folder => folder.name).join(' › ') : '맨 위'} onSave={save} onCancel={() => leave()} />;
}
