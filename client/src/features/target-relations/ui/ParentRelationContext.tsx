import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { ConfirmDialog, FormMessage, MoreMenu, NavIcon } from '@/shared/ui';
import { WorkItemLink } from '@/entities/work-item';
import { relationsQuery, refreshRelations, unlinkTargets } from '@/entities/relation';
import styles from './relations.module.css';

export function ParentRelationContext({ workspaceId, id, canWrite }: { workspaceId: string; id: string; canWrite: boolean }) {
  const parent = useQuery(relationsQuery(workspaceId, 'work_item', id)).data?.find(item => item.relation === 'subtask_of' && item.outgoing);
  const client = useQueryClient(); const [removing, setRemoving] = useState(false); const [error, setError] = useState('');
  const remove = async () => {
    if (!parent) return;
    try { await unlinkTargets(workspaceId, parent.linkId); setRemoving(false); await refreshRelations(client, workspaceId); }
    catch (failure) { setRemoving(false); setError(authError(failure)); }
  };
  if (!parent) return null;
  return <div><div className={styles.parentContext}>
    <NavIcon name="branch" /><span>상위 작업</span>
    <WorkItemLink workspaceId={workspaceId} item={{ id: parent.id, projectId: parent.projectId ?? null }} title={parent.title}>
      <span className={styles.reference}>{parent.reference}</span><span>{parent.title}</span>
    </WorkItemLink>
    {canWrite && <MoreMenu label="상위 작업 메뉴" variant="ghost" items={[{ label: '연결 해제', icon: <NavIcon name="unlink" />, onClick: () => setRemoving(true) }]} />}
  </div><FormMessage message={error} />
    {removing && <ConfirmDialog title="상위 작업 연결을 해제할까요?" description="하위 작업은 독립된 작업으로 남습니다." confirmLabel="연결 해제" onClose={() => setRemoving(false)} onConfirm={() => { void remove(); }} />}
  </div>;
}
