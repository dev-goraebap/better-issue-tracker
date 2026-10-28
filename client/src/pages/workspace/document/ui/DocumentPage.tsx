import { DocumentLinkButton, TargetRelations } from '@/features/target-relations';
import { useState } from 'react';
import { IconButton, useToast } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { authError, isNotFound } from '@/shared/api';
import { MOBILE_QUERY } from '@/shared/config';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { DetailLayout, MarkdownEditor, MoreMenu, BackLink, ConfirmDialog, NavIcon, PageFrame, PageState, QueryMessage } from '@/shared/ui';
import { canManage, canWrite as canWriteIn, workspaceQuery } from '@/entities/workspace';
import { deleteDocument, documentIdOf, documentQuery, folderHref, refreshDocuments, updateDocument } from '@/entities/document';
import { refreshRelations } from '@/entities/relation';
import { AttachmentBody, DetailEngagement, fileHref, useBodyFiles } from '@/features/detail-engagement';
import { EditableTitle, EditBar, InlineBody, LeaveGuard, ReadTitle, SaveQuestions, useInlineEdit } from '@/features/inline-edit';
import { DocumentProperties } from './DocumentProperties';
import { refreshTimeline, WorkItemActivity } from '@/widgets/work-item-detail';
import styles from './document.module.css';

/**
 * A document, /workspaces/$workspaceId/documents/$documentRef (D-093, BIT-41): <제목>-<id>, the id opening it. Its
 * body, then its 활동 and comments (D-078); beside it the folder it is in, its labels, who made it, and the work items
 * with their commits under the body. Its title and body are read until the member asks to write them (D-109: two
 * presses, or 고치기), then written in place and saved together from the bar at the foot (D-107). The menu copies its
 * link or deletes it (it can be restored).
 */
export function DocumentPage() {
  const { workspaceId, documentRef } = useParams({ strict: false }) as { workspaceId: string; documentRef: string };
  const id = documentIdOf(documentRef);
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [isDeleting, setDeleting] = useState(false);
  // Beside the reaction button, where the open editor's attachment button goes (BIT-104).
  const [fileActionHost, setFileActionHost] = useState<HTMLSpanElement | null>(null);
  const result = useQuery(documentQuery(workspaceId, id));
  const role = useQuery(workspaceQuery(workspaceId)).data;
  const canWrite = canWriteIn(role, 'WRITE_DOCUMENTS');
  const text = useInlineEdit({
    current: { title: result.data?.title ?? '', body: result.data?.body ?? '' },
    latest: async () => {
      const fresh = await client.fetchQuery({ ...documentQuery(workspaceId, id), staleTime: 0 });
      return { title: fresh.title, body: fresh.body, version: fresh.version };
    },
    send: async (changes, version) => {
      await updateDocument(workspaceId, id, {
        expectedVersion: version,
        ...(changes.title !== undefined ? { title: changes.title } : {}),
        ...(changes.body !== undefined ? { body: changes.body.trim() } : {}),
        ...(files.uploadIds.length ? { uploadIds: files.uploadIds } : {}),
      });
      await Promise.all([refreshRelations(client, workspaceId), refreshDocuments(client, workspaceId), refreshTimeline(client, workspaceId, 'document', id)]);
    },
    onSaved: () => files.reset(),
  });
  const files = useBodyFiles(text.draft.body);
  const isWriting = canWrite && text.isEditing;
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
  const remove = async () => {
    setDeleting(false);
    try { await deleteDocument(workspaceId, document.id, document.version); }
    catch (failure) { toast({ body: authError(failure) }); return; }
    await refreshDocuments(client, workspaceId);
    afterOverlayClose(() => void navigate({ href: folderHref(workspaceId, document.projectId, folder?.id), replace: true }));
  };
  return <PageFrame isDetail headerLabel="문서" title={document.title} wrapsTitle width="full" back={back} actions={<>
    {canWrite && isMobile && !text.isEditing && <IconButton label="고치기" tooltip="고치기" variant="ghost" icon={<NavIcon name="edit" />} onClick={() => text.edit()} />}
    <MoreMenu label="문서 메뉴" variant="ghost" placement="end" items={[
      { label: '링크 복사', icon: <NavIcon name="link" />, onClick: () => void navigator.clipboard?.writeText(window.location.href) },
      ...(canWrite ? [{ label: '삭제', icon: <NavIcon name="delete" />, onClick: () => setDeleting(true) }] : []),
    ]} />
  </>}>
    <DetailLayout title={isWriting ? <EditableTitle value={text.draft.title} label="문서 제목" onChange={text.setTitle} autoFocus={text.startAt === 'title'} />
      : canWrite ? <ReadTitle onPress={text.hint} onOpen={() => text.edit('title')}>{document.title}</ReadTitle> : document.title}
      properties={<DocumentProperties key={document.id} workspaceId={workspaceId} document={document} canWrite={canWrite} />}>
      <section aria-label="본문" className={styles.body}>
        <InlineBody canOpen={canWrite} isEditing={isWriting} startAt={typeof text.startAt === 'number' ? text.startAt : undefined} onPress={text.hint} onOpen={text.edit}
          read={<AttachmentBody target={{ workspaceId, type: 'document', id: document.id }} value={document.body} empty={canWrite ? '본문을 쓰려면 두 번 누르세요' : '본문이 없습니다.'} />}
          write={startAt => <MarkdownEditor key={text.revision} startAt={startAt} attachmentUrl={fileId => fileHref({ workspaceId, type: 'document', id: document.id }, fileId, false)}
            filePicker={files.picker} filePickerPortal={fileActionHost} linkPicker={insert => <DocumentLinkButton workspaceId={workspaceId} onInsert={insert} />} value={text.draft.body} onChange={text.setBody}
            label="본문" placeholder="쓰기 시작하세요… ( / 로 블록)" />} />
      </section>
      <DetailEngagement target={{ workspaceId, type: 'document', id: document.id }} canWrite={canWrite} actionHost={setFileActionHost} />
        <TargetRelations workspaceId={workspaceId} projectId={document.projectId} type="document" id={document.id} title={document.title} canWrite={canWrite} />
        <WorkItemActivity workspaceId={workspaceId} projectId={document.projectId} workItemId={document.id} targetType="document"
          canWrite={canWrite} canModerate={canManage(role)} />
    </DetailLayout>
    {canWrite && (text.isHinting || text.isEditing) && <EditBar isEditing={text.isEditing} isChanged={text.isChanged} isBusy={text.isBusy || files.isUploading} error={text.error}
      onEdit={() => text.edit()} onView={text.view} onCancel={() => { text.cancel(); files.reset(); }} onSave={() => { void text.save(); }} />}
    <SaveQuestions isAskingScope={false} hasConflict={!!text.conflict} isBusy={text.isBusy} onScope={() => undefined} onCancelScope={text.cancelScope}
      onTakeLatest={text.takeLatest} onKeepMine={() => { void text.keepMine(); }} />
    <LeaveGuard when={text.isChanged} />
    {isDeleting && <ConfirmDialog title="문서를 삭제할까요?" description={`'${document.title}'을(를) 삭제합니다. 되살릴 수 있습니다.`}
      confirmLabel="삭제" variant="destructive" onClose={() => setDeleting(false)} onConfirm={() => { void remove(); }} />}
  </PageFrame>;
}
