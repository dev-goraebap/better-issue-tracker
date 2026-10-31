import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BottomSheet, Button, IconButton, TextInput, useToast } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { MOBILE_QUERY } from '@/shared/config';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { CompactDialog, ConfirmDialog, FormMessage, FrameBody, FrameHead, MoreMenu, NavIcon, PageFrame } from '@/shared/ui';
import { deleteDocument, documentQuery, folderHref, refreshDocuments, updateDocument, type DocumentDetail } from '@/entities/document';
import { DetailEngagement } from '@/features/detail-engagement';
import { TargetRelations } from '@/features/target-relations';
import { WorkItemActivity, refreshTimeline } from '@/widgets/work-item-detail';
import { DocumentProperties } from './DocumentProperties';
import { PageVersionActions } from './PageVersionActions';
import { PageViewer } from './PageViewer';
import { usePagePrint } from '../model/use-page-print';
import styles from './page-document.module.css';

/** A page uses the card as its canvas. Metadata and conversation open beside it, leaving the same frame mounted. */
export function PageDocumentView({ workspaceId, documentRef, document, number, back, canWrite, canModerate }: {
  workspaceId: string; documentRef: string; document: DocumentDetail; number: number; back: ReactNode; canWrite: boolean; canModerate: boolean;
}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [panel, setPanel] = useState<'comments' | 'info' | null>(null);
  const commentsButton = useRef<HTMLButtonElement>(null);
  const panelElement = useRef<HTMLElement>(null);
  const pageFrame = useRef<HTMLIFrameElement>(null);
  const printing = usePagePrint(pageFrame);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [isDeleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const page = document.page;
  useEffect(() => { if (panel && !isMobile) panelElement.current?.focus(); }, [panel, isMobile]);
  const closePanel = () => { setPanel(null); requestAnimationFrame(() => commentsButton.current?.focus()); };
  const rename = async () => {
    if (!title.trim() || busy) return;
    setBusy(true); setError(undefined);
    try {
      const fresh = await client.fetchQuery({ ...documentQuery(workspaceId, document.id), staleTime: 0 });
      await updateDocument(workspaceId, document.id, { title: title.trim(), expectedVersion: fresh.version });
      await Promise.all([refreshDocuments(client, workspaceId), refreshTimeline(client, workspaceId, 'document', document.id)]);
      setRenaming(false);
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setDeleting(false);
    try {
      await deleteDocument(workspaceId, document.id, document.version);
      await refreshDocuments(client, workspaceId);
      afterOverlayClose(() => void navigate({ href: folderHref(workspaceId, document.projectId, document.path.at(-1)?.id), replace: true }));
    } catch (failure) { toast({ body: authError(failure) }); }
  };
  const details = panel === 'comments'
    ? <WorkItemActivity workspaceId={workspaceId} projectId={document.projectId} workItemId={document.id} targetType="document"
      canWrite={canWrite} canModerate={canModerate} hideHeading />
    : <div className={styles.information}>
      <DocumentProperties workspaceId={workspaceId} document={document} canWrite={canWrite} />
      <DetailEngagement target={{ workspaceId, type: 'document', id: document.id }} canWrite={canWrite} />
      <TargetRelations workspaceId={workspaceId} projectId={document.projectId} type="document" id={document.id} title={document.title} canWrite={canWrite} />
    </div>;
  const panelTitle = panel === 'comments' ? '댓글 및 활동' : '페이지 정보';
  return <PageFrame isDetail fillsContent title={document.title} width="full" back={back} actions={<>
    <PageVersionActions workspaceId={workspaceId} documentId={document.id} documentRef={documentRef} page={page} number={number}
      onPrint={printing.print} isPrinting={printing.isPrinting} />
    <IconButton ref={commentsButton} label="댓글" tooltip="댓글 및 활동" variant="ghost" icon={<NavIcon name="comment" />}
      aria-expanded={panel === 'comments'} onClick={() => setPanel(panel === 'comments' ? null : 'comments')} />
    <MoreMenu label="페이지 메뉴" variant="ghost" placement="end" items={[
      { label: '페이지 정보', icon: <NavIcon name="document" />, onClick: () => setPanel('info') },
      { label: '링크 복사', icon: <NavIcon name="link" />, onClick: () => { void navigator.clipboard?.writeText(window.location.href).then(() => toast({ body: '페이지 링크를 복사했습니다.' })).catch(() => toast({ body: '링크를 복사하지 못했습니다.' })); } },
      ...(canWrite ? [
        { label: '이름 바꾸기', icon: <NavIcon name="edit" />, onClick: () => { setTitle(document.title); setError(undefined); setRenaming(true); } },
        { label: '삭제', icon: <NavIcon name="delete" />, onClick: () => setDeleting(true) },
      ] : []),
    ]} />
  </>}>
    <div className={styles.workspace}>
      <PageViewer workspaceId={workspaceId} documentId={document.id} documentRef={documentRef} title={document.title} number={number} frameRef={pageFrame} />
      {panel && !isMobile && <aside ref={panelElement} tabIndex={-1} className={styles.inspector} aria-label={panelTitle} onKeyDown={event => {
        if (event.key === 'Escape' && !event.defaultPrevented) { event.stopPropagation(); closePanel(); }
      }}>
        <FrameHead title={panelTitle} onClose={closePanel} />
        <div className={styles.panelBody}>{details}</div>
      </aside>}
    </div>
    {panel && isMobile && <BottomSheet isOpen label={panelTitle} height="tall" purpose="form" onOpenChange={open => { if (!open) closePanel(); }}>
      <FrameHead title={panelTitle} onClose={closePanel} /><FrameBody>{details}</FrameBody>
    </BottomSheet>}
    {renaming && <CompactDialog title="페이지 이름 바꾸기" isBusy={busy} onClose={() => setRenaming(false)} onSubmit={() => { void rename(); }}
      footer={<><Button label="취소" variant="secondary" isDisabled={busy} onClick={() => setRenaming(false)} /><Button label="저장" type="submit" isDisabled={!title.trim() || busy} isLoading={busy} /></>}>
      <TextInput label="페이지 이름" placeholder="예: 제품 사용 설명서" value={title} onChange={setTitle} hasAutoFocus />
      <FormMessage message={error ? authError(error) : ''} />
    </CompactDialog>}
    {isDeleting && <ConfirmDialog title="페이지를 삭제할까요?" description={`'${document.title}'을(를) 삭제합니다. 되살릴 수 있습니다.`}
      confirmLabel="삭제" variant="destructive" onClose={() => setDeleting(false)} onConfirm={() => { void remove(); }} />}
  </PageFrame>;
}
