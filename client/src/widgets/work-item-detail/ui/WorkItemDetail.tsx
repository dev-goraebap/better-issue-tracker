import { useState } from 'react';
import { IconButton, useToast } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError, isNotFound } from '@/shared/api';
import { MOBILE_QUERY } from '@/shared/config';
import {
  DetailLayout, MarkdownEditor, MoreMenu,
  BackLink, ConfirmDialog, NavIcon, PageState, QueryMessage, SectionHeader, SettingsAction, Surface, usePanelSurface,
} from '@/shared/ui';
import { canManage, canWrite as canWriteIn, workspaceQuery } from '@/entities/workspace';
import {
  archiveItem, deleteItem, itemQuery, refreshItems, stopRepeating, updateItem, workItemHref, type WorkItemSearch,
} from '@/entities/work-item';
import { branchName, codeLinksQuery, CodeLinkList, integrationsQuery } from '@/entities/repository';
import { AttachmentBody, DetailEngagement, fileHref, useBodyFiles } from '@/features/detail-engagement';
import { EditableTitle, InlineBody, LeaveGuard, SaveBar, SaveQuestions, useInlineEdit } from '@/features/inline-edit';
import { ParentRelationContext, TargetRelations } from '@/features/target-relations';
import { refreshTimeline } from '../api/timeline';
import { WorkItemActivity } from './WorkItemActivity';
import { WorkItemProperties } from './WorkItemProperties';
import styles from './detail.module.css';

/**
 * Shared desktop/mobile reading column with directly editable property chips. Its title and description are written in
 * place and saved together from the save bar (D-107): on a desktop whenever the member may write, on a phone after 고치기.
 */
export function WorkItemDetail({ workspaceId, projectId, id, search }: { workspaceId: string; projectId: string; id: string; search: WorkItemSearch }) {
  const panel = usePanelSurface();
  const navigate = useNavigate();
  const client = useQueryClient();
  const toast = useToast();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const list = { to: '/workspaces/$workspaceId/projects/$projectId', params: { workspaceId, projectId }, search } as const;
  const [isDeleting, setDeleting] = useState(false);
  const [isStopping, setStopping] = useState(false);
  const [isWritingOnPhone, setWritingOnPhone] = useState(false);
  const result = useQuery(itemQuery(workspaceId, projectId, id));
  const hasRepository = (useQuery({ ...integrationsQuery(workspaceId, projectId), enabled: !!projectId }).data ?? []).length > 0;
  const links = useQuery({ ...codeLinksQuery(workspaceId, projectId, id), enabled: hasRepository }).data ?? [];
  const role = useQuery(workspaceQuery(workspaceId)).data;
  const canWrite = canWriteIn(role);
  const text = useInlineEdit({
    current: { title: result.data?.title ?? '', body: result.data?.description ?? '' },
    latest: async () => {
      const fresh = await client.fetchQuery({ ...itemQuery(workspaceId, projectId, id), staleTime: 0 });
      return { title: fresh.title, body: fresh.description ?? '', version: fresh.version };
    },
    send: async (changes, version, scope) => {
      await updateItem(workspaceId, projectId, id, {
        expectedVersion: version,
        ...(changes.title !== undefined ? { title: changes.title } : {}),
        ...(changes.body !== undefined ? { description: changes.body.trim() || null } : {}),        // The files uploaded into the words being saved (the description carries their blocks).
        ...(files.uploadIds.length ? { uploadIds: files.uploadIds } : {}),
      }, scope);
      await Promise.allSettled([refreshItems(client, workspaceId, projectId), refreshTimeline(client, workspaceId, 'work_item', id)]);
    },
    isRepeating: !!result.data?.recurrence,
    onSaved: () => { files.reset(); setWritingOnPhone(false); },
  });
  const files = useBodyFiles(text.draft.body);
  const isWriting = canWrite && (!isMobile || isWritingOnPhone);
  const back = projectId ? <BackLink {...list} label="업무" /> : <BackLink to="/workspaces/$workspaceId" params={{ workspaceId }} label="워크스페이스" />;
  if (result.isPending || (result.error && !result.data && !isNotFound(result.error))) return <Surface isDetail title="업무" back={back} width="default">
    <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
  </Surface>;
  const item = result.data;
  if (!item) return <Surface isDetail title="업무를 찾을 수 없습니다" back={back} width="default">
    <PageState kind="not-found" title="업무를 찾을 수 없습니다" description="지워졌거나 주소가 바뀌었습니다. 목록에서 다시 찾아보세요." />
  </Surface>;
  // A change shows in the lists and, as a line of activity, in the work item's timeline.
  const refresh = () => Promise.allSettled([refreshItems(client, workspaceId, projectId), refreshTimeline(client, workspaceId, 'work_item', id)]);
  /** 보관 or 삭제 over the version shown; answers whether it was done. */
  const save = async (change: (version: number) => Promise<unknown>): Promise<boolean> => {
    try { await change(item.version); return true; }
    catch (failure) { toast({ body: authError(failure) }); return false; }
    finally { await refresh(); }
  };
  const leave = () => { if (panel) panel.onClose(); else if (projectId) void navigate(list); else void navigate({ href: `/workspaces/${workspaceId}` }); };
  const copyBranch = () => {
    const branch = branchName(item.key, item.title);
    void navigator.clipboard?.writeText(branch).then(() => toast({ body: `브랜치 이름을 복사했습니다: ${branch}` }), () => toast({ body: '복사하지 못했습니다' }));
  };
  return <Surface isDetail headerLabel={item.key} title={item.title} wrapsTitle back={back} width="full" actions={<>
    {/* A phone reads by default; 고치기 opens the title and description to write, 다 고침 closes them when nothing waits. */}
    {canWrite && isMobile && (isWritingOnPhone
      ? <IconButton label="다 고침" tooltip="다 고침" variant="ghost" size={panel ? 'sm' : undefined} icon={<NavIcon name="check" />} isDisabled={text.isChanged} onClick={() => setWritingOnPhone(false)} />
      : <IconButton label="고치기" tooltip="고치기" variant="ghost" size={panel ? 'sm' : undefined} icon={<NavIcon name="edit" />} onClick={() => setWritingOnPhone(true)} />)}
    <MoreMenu label="업무 메뉴" variant="ghost" size={panel ? 'sm' : undefined} placement="end" items={[
      { label: '링크 복사', icon: <NavIcon name="link" />, onClick: () => void navigator.clipboard?.writeText(`${window.location.origin}${workItemHref(workspaceId, item)}`) },
      { label: '브랜치 이름 복사', icon: <NavIcon name="branch" />, onClick: copyBranch },
      ...(canWrite ? [
        { label: item.archivedAt ? '보관 해제' : '보관', icon: <NavIcon name="documents" />, onClick: () => { void save(version => archiveItem(workspaceId, projectId, id, version, !item.archivedAt)).then(isSaved => { if (isSaved && !item.archivedAt) leave(); }); } },
        ...(item.recurrence ? [{ label: '이후 회차 취소', icon: <NavIcon name="repeat" />, onClick: () => setStopping(true) }] : []),
        { label: '삭제', icon: <NavIcon name="delete" />, onClick: () => setDeleting(true) },
      ] : []),
    ]} />
  </>}>
    <DetailLayout title={isWriting ? <EditableTitle value={text.draft.title} label="업무 제목" onChange={text.setTitle} /> : item.title}
      context={<ParentRelationContext workspaceId={workspaceId} id={id} canWrite={canWrite} />} properties={<>
      <WorkItemProperties key={id} item={item} canWrite={canWrite} />
    </>}>
        <section aria-label="설명" className={styles.description}>
          <InlineBody canOpen={isWriting} isKept={text.isChanged || isWritingOnPhone} revision={text.revision}
            read={<AttachmentBody target={{ workspaceId, type: 'work_item', id }} value={item.description ?? ''} empty={isWriting ? '설명을 덧붙이려면 누르세요' : '설명이 없습니다.'} />}
            write={startAt => <MarkdownEditor key={text.revision} startAt={startAt} attachmentUrl={fileId => fileHref({ workspaceId, type: 'work_item', id }, fileId, false)}
              filePicker={files.picker} value={text.draft.body} onChange={text.setBody} label="설명" placeholder="설명을 덧붙이세요… ( / 로 블록)" />} />
        </section>
        <DetailEngagement target={{ workspaceId, type: 'work_item', id }} canWrite={canWrite} />
        <TargetRelations workspaceId={workspaceId} projectId={projectId || undefined} type="work_item" id={id} title={item.title} canWrite={canWrite} typeId={item.type?.id} />
        {(hasRepository || links.length > 0) && <section aria-labelledby="detail-code">
          <SectionHeader id="detail-code" title="연결된 코드" actions={<SettingsAction label="브랜치 이름 복사" tooltip="브랜치 이름 복사" icon="branch" onClick={copyBranch} />} />
          {links.length > 0 ? <CodeLinkList links={links} />
            : <p className={styles.codeHint}>브랜치나 커밋, PR 제목에 <code>{item.key}</code>를 넣으면 여기에 붙습니다. 브랜치 이름은 오른쪽 버튼으로 복사하세요.</p>}
        </section>}
        <WorkItemActivity workspaceId={workspaceId} projectId={projectId} workItemId={id} canWrite={canWrite} canModerate={canManage(role)} />
    </DetailLayout>
    {(text.isChanged || text.error) && <SaveBar isBusy={text.isBusy || files.isUploading} error={text.error} onUndo={text.undo} onSave={() => { void text.save(); }} />}
    <SaveQuestions isAskingScope={text.isAskingScope} hasConflict={!!text.conflict} isBusy={text.isBusy} onScope={scope => { void text.save(scope); }}
      onCancelScope={text.cancelScope} onTakeLatest={text.takeLatest} onKeepMine={() => { void text.keepMine(); }} />
    <LeaveGuard when={text.isChanged} />
    {isStopping && <ConfirmDialog title="이후 회차를 취소할까요?" description={`${item.key} 뒤에 만들어진 회차를 지우고 반복을 끝냅니다. 이 회차는 남습니다.`}
      confirmLabel="이후 회차 취소" variant="destructive" onClose={() => setStopping(false)}
      onConfirm={() => { setStopping(false); void save(version => stopRepeating(workspaceId, projectId, id, version)); }} />}
    {isDeleting && <ConfirmDialog title="업무를 삭제할까요?" description={`${item.key} ${item.title}을(를) 삭제합니다. 관리자는 되살릴 수 있습니다.`}
      confirmLabel="삭제" variant="destructive" onClose={() => setDeleting(false)}
      onConfirm={() => { setDeleting(false); void save(version => deleteItem(workspaceId, projectId, id, version)).then(isSaved => { if (isSaved) leave(); }); }} />}
  </Surface>;
}
