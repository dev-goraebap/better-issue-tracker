import { emptyTaskSearch } from '@/features/work-item-filters';
import { useState } from 'react';
import { Button, Heading, HStack, Markdown, Text, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { columnsQuery, projectQuery } from '@/entities/project';
import { itemQuery, itemPath, refreshItems, PRIORITIES, TRIGGERS } from '@/entities/work-item';
import { workspaceQuery } from '@/entities/workspace';
import { MoveWorkItem } from '@/features/move-work-item';
import { authError, command } from '@/shared/api';
import { CompactDialog, FormMessage, PageFrame, QueryMessage, SectionHeader } from '@/shared/ui';
import { WorkItemEditor } from './WorkItemEditor';
import styles from './work-item-detail.module.css';
export function WorkItemDetailPage() {
  const { workspaceId = '', projectId = '', workItemId = '' } = useParams({ strict: false }); const client = useQueryClient(); const navigate = useNavigate();
  const result = useQuery(itemQuery(workspaceId, projectId, workItemId)); const columns = useQuery(columnsQuery(workspaceId, projectId)); const project = useQuery(projectQuery(workspaceId, projectId)); const space = useQuery(workspaceQuery(workspaceId));
  const [editing, setEditing] = useState(false); const [removing, setRemoving] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const item = result.error ? undefined : result.data; const canWrite = !!space.data && !!project.data && !space.error && !project.error && space.data.myRole !== 'viewer' && !project.data.archivedAt;
  async function archive() { if (!item || busy) return; setBusy(true); setError(''); try { await command('POST', `${itemPath(workspaceId, projectId, workItemId)}/${item.archivedAt ? 'unarchive' : 'archive'}`, { expectedVersion: item.version }); setNotice(item.archivedAt ? '보관을 해제했습니다.' : '작업을 보관했습니다.'); } catch (failure) { setError(authError(failure)); } setBusy(false); await refreshItems(client, workspaceId, projectId); }
  return <PageFrame title={item?.key ?? '작업 상세'} width="narrow" actions={item && canWrite && !editing && <Button label="편집" variant="primary" onClick={() => { setNotice(''); setEditing(true); }} />}>
    <Link to="/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId }} search={{ ...emptyTaskSearch(), view: 'board' }}>프로젝트로 돌아가기</Link>
    <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} /><FormMessage message={error} /><FormMessage message={notice} isError={false} />
    {item && <>{editing && canWrite ? <WorkItemEditor key={item.id} item={item} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setNotice('변경을 저장했습니다.'); }} /> : <>
      <VStack gap={2}><Text type="supporting" color="secondary">{item.key}{item.archivedAt ? ' · 보관됨' : ''}</Text><Heading level={2}>{item.title}</Heading></VStack>
      <dl className={styles.facts}><dt>상태</dt><dd>{columns.data?.find(c => c.id === item.columnId)?.name ?? (item.columnId ? '컬럼' : '백로그')}{item.closedAt ? ' · 완료' : ''}</dd><dt>담당자</dt><dd>{item.assigneeName ?? '없음'}</dd><dt>우선순위</dt><dd>{item.priority ? PRIORITIES[item.priority] : '없음'}</dd><dt>트리거</dt><dd>{item.triggerType ? TRIGGERS[item.triggerType] : '없음'}</dd><dt>기간</dt><dd>{item.startDate ?? '미정'} ~ {item.dueDate ?? '미정'}</dd></dl>
      <SectionHeader title="설명" /><section className={styles.description}><Markdown>{item.description || '설명이 없습니다.'}</Markdown></section>
      <Text type="supporting" color="secondary">{item.createdByAgent ? `${item.createdByAgent} · ` : ''}생성 {new Date(item.createdAt).toLocaleString('ko-KR')} · 수정 {new Date(item.updatedAt).toLocaleString('ko-KR')}</Text>
      {canWrite && <HStack gap={3} wrap="wrap" data-action-row><MoveWorkItem item={item} columns={columns.data ?? []} disabled={busy || columns.isPending || !!columns.error} /><Button label={item.archivedAt ? '보관 해제' : '보관'} onClick={() => { void archive(); }} isDisabled={busy} /><Button label="작업 삭제" variant="ghost" onClick={() => setRemoving(true)} isDisabled={busy} /></HStack>}
    </>}</>}
    <CompactDialog isOpen={removing} title="작업을 삭제할까요?" isBusy={busy} onClose={() => setRemoving(false)} footer={<><Button label="취소" variant="ghost" onClick={() => setRemoving(false)} isDisabled={busy} /><Button label="삭제" variant="primary" isLoading={busy} onClick={async () => { if (!item || busy) return; setBusy(true); setError(''); try { await command('DELETE', `${itemPath(workspaceId, projectId, workItemId)}?expectedVersion=${item.version}`); } catch (failure) { setError(authError(failure)); setBusy(false); return; } setBusy(false); setRemoving(false); await refreshItems(client, workspaceId, projectId); void navigate({ to: '/w/$workspaceId/p/$projectId', params: { workspaceId, projectId }, search: { ...emptyTaskSearch(), view: 'board' } }); }} /></>}><Text>목록에서 숨깁니다. 프로젝트의 삭제 목록에서 복원할 수 있습니다.</Text><FormMessage message={error} /></CompactDialog>
  </PageFrame>;
}
