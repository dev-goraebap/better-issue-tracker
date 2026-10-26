import { useState } from 'react';
import { Button, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage, NavIcon, QueryMessage, Select, SettingsAction, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';
import { columnsQuery, deleteColumn, projectQuery, refreshProjects, reorderColumns, type BoardColumn, type Project } from '@/entities/project';
import { CATEGORY_LABELS, StatusBadge } from '@/entities/issue';
import { ColumnDialog } from './ColumnDialog';
import { useColumnReorder } from './useColumnReorder';
import styles from './project-settings.module.css';

const BACKLOG = 'backlog';

/**
 * 보드 칸: the project's board columns in order, each its category's mark, name and category, the one that finishes work
 * marked (D-049: at least one, and never the last column removed). A column is put in its place by its grip
 * (useColumnReorder: carried by mouse or finger, or Alt + ↑ / ↓). 새 칸 and 고치기 open the same short dialog; 삭제 asks
 * where the column's issues go (another column, or 상태 없음).
 */
export function BoardSettings({ project, canManage }: { project: Project; canManage: boolean }) {
  const client = useQueryClient();
  const columns = useQuery(columnsQuery(project.workspaceId, project.id));
  const [editing, setEditing] = useState<BoardColumn | 'new' | null>(null);
  const [removing, setRemoving] = useState<BoardColumn | null>(null);
  const [moveTo, setMoveTo] = useState(BACKLOG);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable = canManage && !project.archivedAt;
  const list = [...(columns.data ?? [])].sort((a, b) => a.position - b.position);
  // Each order goes with the project's version as last read: one saved before it has moved that on.
  const reorder = useColumnReorder(list, styles.ghost, async order => {
    setError('');
    const version = client.getQueryData(projectQuery(project.workspaceId, project.id).queryKey)?.version ?? project.version;
    try { await reorderColumns(project.workspaceId, project.id, version, order); }
    finally { await refreshProjects(client, project.workspaceId); }
  }, failure => setError(authError(failure)));
  const shown = reorder.order.flatMap(id => list.filter(column => column.id === id));
  const remove = async () => {
    if (!removing || isBusy) return;
    setBusy(true); setError('');
    try {
      await deleteColumn(project.workspaceId, project.id, removing.id, removing.version, moveTo);
      setRemoving(null);
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); await refreshProjects(client, project.workspaceId); }
  };
  return <VStack gap={8}>
    <SettingsHead title="보드 칸" description="이슈가 흘러가는 칸입니다. 완료 칸에 들어간 이슈는 끝난 것으로 셉니다." />
    {!columns.data ? <QueryMessage pending={columns.isPending} error={columns.error} retry={() => { void columns.refetch(); }} />
      : <SettingsCard title={`칸 ${list.length}개`} id="board-columns"
        actions={editable ? <Button label="새 칸" variant="secondary" size="sm" icon={<NavIcon name="plus" />} onClick={() => setEditing('new')} /> : undefined}>
        <div ref={reorder.list} className={styles.columns} role="list" aria-label="보드 칸 순서">
          {shown.map(column => <div key={column.id} className={styles.column} role="listitem" {...reorder.rowProps(column.id)}>
            <SettingsRow lead={<span className={styles.lead}>
              {editable && <button type="button" className={styles.grip} {...reorder.gripProps(column)}><NavIcon name="grip" /></button>}
              <StatusBadge category={column.category} isLabelHidden />
            </span>}
            label={<>{column.name}{column.isFinal && <> <StatusToken label="완료 칸" color="green" /></>}</>} description={CATEGORY_LABELS[column.category]}>
              {editable && <span className={styles.rowActions}>
                <SettingsAction label={`${column.name} 고치기`} tooltip="고치기" icon="edit" onClick={() => setEditing(column)} />
                <SettingsAction label={`${column.name} 삭제`} tooltip="삭제" icon="delete" tone="danger" isDisabled={list.length < 2}
                  onClick={() => { setMoveTo(BACKLOG); setRemoving(column); }} />
              </span>}
            </SettingsRow>
          </div>)}
        </div>
      </SettingsCard>}
    {editable && <>
      <span id={reorder.hint} className={styles.hidden}>끌어서 옮기거나, Alt와 위아래 화살표로 한 칸씩 옮깁니다. 끄는 동안 Esc는 취소입니다.</span>
      <span className={styles.hidden} role="status" aria-live="polite">{reorder.said}</span>
    </>}
    <FormMessage message={error} />
    {editing && <ColumnDialog project={project} column={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    <CompactDialog isOpen={!!removing} title={`'${removing?.name ?? ''}' 칸을 지울까요?`} width={520} isBusy={isBusy} onClose={() => { if (!isBusy) setRemoving(null); }}
      footer={<><Button label="취소" variant="ghost" onClick={() => setRemoving(null)} isDisabled={isBusy} /><Button label="옮기고 지우기" variant="destructive" isLoading={isBusy} onClick={() => { void remove(); }} /></>}>
      <Select label="이 칸의 이슈를 옮길 곳" value={moveTo} onChange={value => setMoveTo(value ?? BACKLOG)}
        options={[{ value: BACKLOG, label: '상태 없음' }, ...list.filter(column => column.id !== removing?.id).map(column => ({ value: column.id, label: column.name }))]} />
    </CompactDialog>
  </VStack>;
}
