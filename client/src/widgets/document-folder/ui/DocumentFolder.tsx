import { Fragment, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { ConfirmDialog, PageFrame, PageState, QueryMessage } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { canWrite as canWriteIn, workspaceQuery } from '@/entities/workspace';
import { contentsQuery, createFolder, deleteFolder, FolderLink, refreshDocuments, renameFolder, type Folder } from '@/entities/document';
import { FolderNameDialog } from './FolderNameDialog';
import { FolderRows } from './FolderRows';
import styles from './folder.module.css';

/**
 * One folder of a part opened (D-093, BIT-41): a project's 문서, or 문서함's own folders. The way down to it leads the
 * page (the part, then each folder); its folders come first, then its documents, as a list. Someone who may write
 * makes a folder or a document here, and renames or
 * deletes an empty folder from its row. lead is what goes above the contents at the part's top (문서함's projects).
 */
export function DocumentFolder({ workspaceId, projectId, folderId, title, rootLabel, lead }: {
  workspaceId: string; projectId: string | null; folderId?: string; title: string; rootLabel: string; lead?: ReactNode;
}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [naming, setNaming] = useState<{ folder?: Folder } | null>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);
  const [deleteError, setDeleteError] = useState<Error | null>(null);
  const contents = useQuery(contentsQuery(workspaceId, projectId ?? undefined, folderId));
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const canWrite = canWriteIn(useQuery(workspaceQuery(workspaceId)).data?.myRole);
  const data = contents.data;
  const name = async (value: string) => {
    try {
      if (naming?.folder) await renameFolder(workspaceId, naming.folder.id, { expectedVersion: naming.folder.version, name: value });
      else await createFolder(workspaceId, { projectId, parentId: folderId ?? null, name: value });
    } catch (failure) { return authError(failure); }
    await refreshDocuments(client, workspaceId);
    setNaming(null);
    return undefined;
  };
  const remove = async () => {
    if (!deleting) return;
    try { await deleteFolder(workspaceId, deleting.id, deleting.version); }
    catch (failure) { setDeleteError(new Error(authError(failure))); return; }
    await refreshDocuments(client, workspaceId);
    setDeleting(null);
  };
  const newDocument = () => void navigate({ to: '/workspaces/$workspaceId/documents/new', params: { workspaceId },
    search: { ...(projectId ? { project: projectId } : {}), ...(folderId ? { folder: folderId } : {}) } });
  const here = data?.path.at(-1);
  const actions = <>
    {canWrite && <Button label="새 폴더" size="sm" variant="secondary" onClick={() => setNaming({})} />}
    {canWrite && <Button label="새 문서" size="sm" variant="primary" onClick={newDocument} />}
  </>;
  const isEmpty = !!data && data.folders.length === 0 && data.documents.length === 0;
  const props = data && { workspaceId, projectId, folders: data.folders, documents: data.documents, labels };
  return <PageFrame title={here?.name ?? title} icon="documents" chrome="header" actions={actions}>
    {data && data.path.length > 0 && <nav className={styles.trail} aria-label="위치">
      <FolderLink workspaceId={workspaceId} projectId={projectId}>{rootLabel}</FolderLink>
      {data.path.map((folder, at) => <Fragment key={folder.id}><span aria-hidden="true">›</span>
        {at === data.path.length - 1 ? <span aria-current="page">{folder.name}</span>
          : <FolderLink workspaceId={workspaceId} projectId={projectId} folderId={folder.id}>{folder.name}</FolderLink>}
      </Fragment>)}
    </nav>}
    {!folderId && lead}
    {!data ? <QueryMessage pending={contents.isPending} error={contents.error} retry={() => { void contents.refetch(); }} />
      : isEmpty ? <div className={styles.empty}><PageState title="아직 문서가 없습니다" description={canWrite ? '새 문서나 새 폴더로 시작하세요. 요구사항, 설계, 회의록, 결정기록을 여기에 씁니다.' : '이 폴더에는 아직 문서가 없습니다.'} /></div>
      : props && <div className={styles.flush}><FolderRows {...props} onRename={canWrite ? folder => setNaming({ folder }) : undefined}
        onDelete={canWrite ? folder => { setDeleteError(null); setDeleting(folder); } : undefined} /></div>}
    {naming && <FolderNameDialog from={naming.folder?.name} onSave={name} onClose={() => setNaming(null)} />}
    {deleting && <ConfirmDialog title={`'${deleting.name}' 폴더를 지울까요?`} description="빈 폴더만 지울 수 있습니다. 안의 폴더와 문서를 먼저 옮기거나 지우세요."
      confirmLabel="지우기" variant="destructive" error={deleteError} onClose={() => setDeleting(null)} onConfirm={() => { void remove(); }} />}
  </PageFrame>;
}
