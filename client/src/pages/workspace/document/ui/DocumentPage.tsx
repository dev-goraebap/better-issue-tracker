import { useState } from 'react';
import { useToast } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { authError, isNotFound } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { MoreMenu, BackLink, ConfirmDialog, MarkdownView, NavIcon, PageFrame, PageState, QueryMessage, SectionHeader, SettingsAction } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { canManage, canWrite as canWriteIn, useMembers, workspaceQuery } from '@/entities/workspace';
import { LabelTokens } from '@/entities/work-item';
import { deleteDocument, documentIdOf, documentQuery, FolderLink, folderHref, refreshDocuments } from '@/entities/document';
import { WorkItemActivity } from '@/widgets/work-item-detail';
import { LinkedWorkItem } from './LinkedWorkItem';
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
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const members = useMembers(workspaceId).items;
  const role = useQuery(workspaceQuery(workspaceId)).data?.myRole;
  const canWrite = canWriteIn(role);
  const document = result.data;
  if (!document) return <PageFrame title="문서" width="default" back={<BackLink to="/workspaces/$workspaceId/documents" params={{ workspaceId }} label="문서함" />}>
    {result.error && isNotFound(result.error)
      ? <PageState kind="not-found" title="문서를 찾을 수 없습니다" description="지워졌거나 주소가 바뀌었습니다. 문서함에서 다시 찾아보세요." />
      : <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />}
  </PageFrame>;
  const folder = document.path.at(-1);
  const search = folder ? { folder: folder.id } : {};
  const back = document.projectId
    ? <BackLink to="/workspaces/$workspaceId/projects/$projectId/documents" params={{ workspaceId, projectId: document.projectId }} search={search} label={folder?.name ?? '문서'} />
    : <BackLink to="/workspaces/$workspaceId/documents" params={{ workspaceId }} search={search} label={folder?.name ?? '문서함'} />;
  const name = (userId: string) => members.find(member => member.userId === userId)?.name ?? '지워진 구성원';
  const edit = () => void navigate({ to: '/workspaces/$workspaceId/documents/$documentRef/edit', params: { workspaceId, documentRef } });
  const remove = async () => {
    setDeleting(false);
    try { await deleteDocument(workspaceId, document.id, document.version); }
    catch (failure) { toast({ body: authError(failure) }); return; }
    await refreshDocuments(client, workspaceId);
    afterOverlayClose(() => void navigate({ href: folderHref(workspaceId, document.projectId, folder?.id), replace: true }));
  };
  return <PageFrame title={document.title} wrapsTitle width="default" back={back} actions={<>
    {canWrite && <SettingsAction label="편집" tooltip="편집" icon="edit" onClick={edit} />}
    <MoreMenu label="문서 메뉴" variant="ghost" placement="end" items={[
      { label: '링크 복사', icon: <NavIcon name="link" />, onClick: () => void navigator.clipboard?.writeText(window.location.href) },
      ...(canWrite ? [{ label: '삭제', icon: <NavIcon name="delete" />, onClick: () => setDeleting(true) }] : []),
    ]} />
  </>}>
    <div className={styles.layout}>
      <div className={styles.main}>
        <section aria-labelledby="document-body">
          <SectionHeader id="document-body" title="본문" />
          <MarkdownView value={document.body} empty="본문이 없습니다." />
        </section>
        <section aria-labelledby="document-work">
          <SectionHeader id="document-work" title="연결된 업무" />
          {document.workItems.length > 0
            ? <ul className={styles.items}>{document.workItems.map(item => <LinkedWorkItem key={item.linkId} workspaceId={workspaceId} item={item} />)}</ul>
            : <p className={styles.none}>없음</p>}
        </section>
        <WorkItemActivity workspaceId={workspaceId} projectId={document.projectId} workItemId={document.id} targetType="document"
          canWrite={canWrite} canModerate={canManage(role)} />
      </div>
      <aside className={styles.aside} aria-label="속성">
        <h2 className={styles.asideHead}>속성</h2>
        <dl className={styles.properties}>
          <div className={styles.property}><dt className={styles.spoken}>폴더</dt><dd><NavIcon name="documents" />
            <FolderLink workspaceId={workspaceId} projectId={document.projectId} folderId={folder?.id}>{folder ? document.path.map(each => each.name).join(' › ') : document.projectId ? '문서' : '문서함'}</FolderLink></dd></div>
          <div className={styles.property}><dt className={styles.spoken}>만든 사람</dt><dd><NavIcon name="person" />{name(document.createdBy)}{document.createdByAgent ? ` (${document.createdByAgent})` : ''}</dd></div>
        </dl>
        <h2 className={styles.asideHead}>라벨</h2>
        <div className={styles.asideLabels}>{document.labelIds.length > 0
          ? <LabelTokens labels={labels.filter(label => document.labelIds.includes(label.id))} /> : <span className={styles.none}>없음</span>}</div>
        <p className={styles.made}>{dateText(document.createdAt)} 만듦{document.updatedAt !== document.createdAt ? ` · ${dateText(document.updatedAt)} 고침` : ''}</p>
      </aside>
    </div>
    {isDeleting && <ConfirmDialog title="문서를 삭제할까요?" description={`'${document.title}'을(를) 삭제합니다. 되살릴 수 있습니다.`}
      confirmLabel="삭제" variant="destructive" onClose={() => setDeleting(false)} onConfirm={() => { void remove(); }} />}
  </PageFrame>;
}
