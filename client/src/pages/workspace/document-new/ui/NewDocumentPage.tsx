import { refreshRelations } from '@/entities/relation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { BackLink } from '@/shared/ui';
import { projectQuery } from '@/entities/project';
import { contentsQuery, createDocument, documentHref, folderHref, refreshDocuments, type NewDocumentSearch } from '@/entities/document';
import { DocumentForm, type DocumentDraft } from './DocumentForm';

/**
 * 새 문서, /workspaces/$workspaceId/documents/new?project=&folder= (BIT-41): a document written into the folder it was
 * started from (a project's part, or the workspace's own), then opened.
 */
export function NewDocumentPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const { project, folder } = useSearch({ strict: false }) as NewDocumentSearch;
  const client = useQueryClient();
  const navigate = useNavigate();
  const projectName = useQuery({ ...projectQuery(workspaceId, project ?? ''), enabled: !!project }).data?.name;
  const path = useQuery({ ...contentsQuery(workspaceId, project, folder), enabled: !!folder }).data?.path ?? [];
  const place = [project ? projectName ?? '프로젝트' : '공통', ...path.map(each => each.name)].join(' › ');
  const back = project
    ? <BackLink to="/workspaces/$workspaceId/projects/$projectId/documents" params={{ workspaceId, projectId: project }} search={folder ? { folder } : {}} label="문서" />
    : <BackLink to="/workspaces/$workspaceId/documents" params={{ workspaceId }} search={folder ? { folder } : {}} label="문서함" />;
  const save = async (draft: DocumentDraft) => {
    let id: string;
    try {
      id = await createDocument(workspaceId, { projectId: project ?? null, folderId: folder ?? null, title: draft.title, body: draft.body, uploadIds: draft.uploadIds, labelIds: draft.labelIds });
    } catch (failure) { return authError(failure); }
    await Promise.all([refreshDocuments(client, workspaceId), refreshRelations(client, workspaceId)]);
    void navigate({ href: documentHref(workspaceId, { id, title: draft.title }), replace: true });
    return undefined;
  };
  return <DocumentForm isCreate workspaceId={workspaceId} title="새 문서" back={back} place={place} initial={{ title: '', body: '', labelIds: [] }} saveLabel="문서 만들기"
    onSave={save} onCancel={() => void navigate({ href: folderHref(workspaceId, project ?? null, folder) })} />;
}
