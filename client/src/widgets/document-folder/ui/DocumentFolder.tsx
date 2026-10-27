import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { CompactDialog, ConfirmDialog, ListSummary, ListToolbar, NavIcon, PageFrame, PageState, QueryMessage } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { canWrite as canWriteIn, workspaceQuery } from '@/entities/workspace';
import { contentsQuery, createFolder, deleteFolder, refreshDocuments, renameFolder, type Folder } from '@/entities/document';
import { rowsOf, type ProjectFolder } from '../model/rows';
import { FolderNameDialog, type FolderDraft } from './FolderNameDialog';
import { FolderTable } from './FolderTable';
import { FolderTrail } from './FolderTrail';

/**
 * One folder of a part opened (D-093, BIT-41): a project's 문서, or 문서함's own folders. The way down to it leads the
 * page (the part, then each folder); its folders come first, then its documents, as a list. Someone who may write
 * makes a folder or a document here, and renames or
 * deletes an empty folder from its row. Project folders lead the same table at 문서함's top.
 */
export function DocumentFolder({ workspaceId, projectId, folderId, title, rootLabel, projects = [] }: {
  workspaceId: string; projectId: string | null; folderId?: string; title: string; rootLabel: string; projects?: readonly ProjectFolder[];
}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [naming, setNaming] = useState<{ folder?: Folder } | null>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);
  const [deleteError, setDeleteError] = useState<Error | null>(null);
  const [isChoosing, setChoosing] = useState(false);
  const [isDeleting, setDeletingBusy] = useState(false);
  const contents = useQuery(contentsQuery(workspaceId, projectId ?? undefined, folderId));
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const canWrite = canWriteIn(useQuery(workspaceQuery(workspaceId)).data?.myRole);
  const data = contents.data;
  const name = async (draft: FolderDraft) => {
    try {
      if (naming?.folder) await renameFolder(workspaceId, naming.folder.id, { expectedVersion: naming.folder.version, ...draft });
      else await createFolder(workspaceId, { projectId, parentId: folderId ?? null, ...draft });
    } catch (failure) { return authError(failure); }
    await refreshDocuments(client, workspaceId);
    setNaming(null);
    return undefined;
  };
  const remove = async () => {
    if (!deleting || isDeleting) return;
    setDeletingBusy(true);
    try {
      await deleteFolder(workspaceId, deleting.id, deleting.version);
      await refreshDocuments(client, workspaceId);
      setDeleting(null);
    }
    catch (failure) { setDeleteError(new Error(authError(failure))); return; }
    finally { setDeletingBusy(false); }
  };
  const newDocument = () => void navigate({ to: '/workspaces/$workspaceId/documents/new', params: { workspaceId },
    search: { ...(projectId ? { project: projectId } : {}), ...(folderId ? { folder: folderId } : {}) } });
  const here = data?.path.at(-1);
  const rows = rowsOf(folderId ? [] : projects, data?.folders ?? [], data?.documents ?? []);
  const choices = [
    { label: '새 문서', icon: 'document', onClick: newDocument },
    { label: '새 폴더', icon: 'documents', onClick: () => setNaming({}) },
  ];
  return <PageFrame title={here?.name ?? title} icon="documents" chrome="header"
    tabs={data && data.path.length > 0 ? <FolderTrail workspaceId={workspaceId} projectId={projectId} rootLabel={rootLabel} path={data.path} /> : undefined}>
    <ListToolbar action={canWrite ? { label: '만들기', icon: 'plus', isCreate: true, onClick: () => setChoosing(true), choices } : undefined} />
    {!data ? <QueryMessage pending={contents.isPending} error={contents.error} retry={() => { void contents.refetch(); }} />
      : rows.length === 0 ? <PageState title="아직 문서가 없습니다" description={canWrite ? '새 문서나 새 폴더로 시작하세요. 요구사항, 설계, 회의록, 결정기록을 여기에 씁니다.' : '이 폴더에는 아직 문서가 없습니다.'} />
      : <FolderTable workspaceId={workspaceId} projectId={projectId} rows={rows} labels={labels}
        foot={<ListSummary shown={rows.length} total={rows.length} unit="개" step={rows.length} hasMore={false} onMore={() => {}} />}
        onRename={canWrite ? folder => setNaming({ folder }) : undefined}
        onDelete={canWrite ? folder => { setDeleteError(null); setDeleting(folder); } : undefined} />}
    {isChoosing && <CompactDialog title="만들기" onClose={() => setChoosing(false)} footer={null}>
      {choices.map(choice => <Button key={choice.label} label={choice.label} icon={<NavIcon name={choice.icon} />} variant="ghost"
        onClick={() => { setChoosing(false); choice.onClick(); }} />)}
    </CompactDialog>}
    {naming && <FolderNameDialog from={naming.folder} onSave={name} onClose={() => setNaming(null)} />}
    {deleting && <ConfirmDialog title={`'${deleting.name}' 폴더를 지울까요?`} description="빈 폴더만 지울 수 있습니다. 안의 폴더와 문서를 먼저 옮기거나 지우세요."
      confirmLabel="지우기" variant="destructive" word="삭제" isPending={isDeleting} error={deleteError} onClose={() => setDeleting(null)} onConfirm={() => { void remove(); }} />}
  </PageFrame>;
}
