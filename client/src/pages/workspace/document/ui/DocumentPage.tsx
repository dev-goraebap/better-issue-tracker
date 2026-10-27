import { TargetRelations } from '@/features/target-relations';
import { useState } from 'react';
import { useToast } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { authError, isNotFound } from '@/shared/api';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { DetailLayout, MoreMenu, BackLink, ConfirmDialog, NavIcon, PageFrame, PageState, QueryMessage, SettingsAction } from '@/shared/ui';
import { canManage, canWrite as canWriteIn, workspaceQuery } from '@/entities/workspace';
import { deleteDocument, documentIdOf, documentQuery, folderHref, refreshDocuments } from '@/entities/document';
import { AttachmentBody, DetailEngagement } from '@/features/detail-engagement';
import { DocumentProperties } from './DocumentProperties';
import { WorkItemActivity } from '@/widgets/work-item-detail';
import styles from './document.module.css';

/**
 * A document read, /workspaces/$workspaceId/documents/$documentRef (D-093, BIT-41): <제목>-<id>, the id opening it. Its
 * body rendered, then its 활동 and comments (D-078); beside it the folder it is in, its labels, who made it, and the
 * work items with their commits under the body. 편집 changes its title, body and labels on its own page; the menu
 * copies its link or deletes it (it can be restored).
 */
export function DocumentPage() {
  const { workspaceId, documentRef } = useParams({ strict: false }) as { workspaceId: string; documentRef: string };
  const id = documentIdOf(documentRef);
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [isDeleting, setDeleting] = useState(false);
  const result = useQuery(documentQuery(workspaceId, id));
  const role = useQuery(workspaceQuery(workspaceId)).data;
  const canWrite = canWriteIn(role, 'WRITE_DOCUMENTS');
  const document = result.data;
  if (!document) return <PageFrame isDetail title="문서" width="default" back={<BackLink to="/workspaces/$workspaceId/documents" params={{ workspaceId }} label="문서함" />}>
    {result.error && isNotFound(result.error)
      ? <PageState kind="not-found" title="문서를 찾을 수 없습니다" description="지워졌거나 주소가 바뀌었습니다. 문서함에서 다시 찾아보세요." />
      : <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />}
  </PageFrame>;
  const folder = document.path.at(-1);
  const search = folder ? { folder: folder.id } : {};
  const back = document.projectId
    ? <BackLink to="/workspaces/$workspaceId/projects/$projectId/documents" params={{ workspaceId, projectId: document.projectId }} search={search} label={folder?.name ?? '문서'} />
    : <BackLink to="/workspaces/$workspaceId/documents" params={{ workspaceId }} search={search} label={folder?.name ?? '문서함'} />;
  const edit = () => void navigate({ to: '/workspaces/$workspaceId/documents/$documentRef/edit', params: { workspaceId, documentRef } });
  const remove = async () => {
    setDeleting(false);
    try { await deleteDocument(workspaceId, document.id, document.version); }
    catch (failure) { toast({ body: authError(failure) }); return; }
    await refreshDocuments(client, workspaceId);
    afterOverlayClose(() => void navigate({ href: folderHref(workspaceId, document.projectId, folder?.id), replace: true }));
  };
  return <PageFrame isDetail headerLabel="문서" title={document.title} wrapsTitle width="full" back={back} actions={<>
    {canWrite && <SettingsAction label="편집" tooltip="편집" icon="edit" onClick={edit} />}
    <MoreMenu label="문서 메뉴" variant="ghost" placement="end" items={[
      { label: '링크 복사', icon: <NavIcon name="link" />, onClick: () => void navigator.clipboard?.writeText(window.location.href) },
      ...(canWrite ? [{ label: '삭제', icon: <NavIcon name="delete" />, onClick: () => setDeleting(true) }] : []),
    ]} />
  </>}>
    <DetailLayout title={document.title} properties={<DocumentProperties key={document.id} workspaceId={workspaceId} document={document} canWrite={canWrite} />}>
      <section aria-label="본문" className={styles.body}><AttachmentBody target={{ workspaceId, type: 'document', id: document.id }} value={document.body} empty="본문이 없습니다." /></section>
      <DetailEngagement target={{ workspaceId, type: 'document', id: document.id }} canWrite={canWrite} />
        <TargetRelations workspaceId={workspaceId} projectId={document.projectId} type="document" id={document.id} title={document.title} canWrite={canWrite} />
        <WorkItemActivity workspaceId={workspaceId} projectId={document.projectId} workItemId={document.id} targetType="document"
          canWrite={canWrite} canModerate={canManage(role)} />
    </DetailLayout>
    {isDeleting && <ConfirmDialog title="문서를 삭제할까요?" description={`'${document.title}'을(를) 삭제합니다. 되살릴 수 있습니다.`}
      confirmLabel="삭제" variant="destructive" onClose={() => setDeleting(false)} onConfirm={() => { void remove(); }} />}
  </PageFrame>;
}
