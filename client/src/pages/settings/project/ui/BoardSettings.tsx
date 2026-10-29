import { useState } from 'react';
import { Button, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { rowReorderStyles as rows, useRowReorder } from '@/shared/lib/row-reorder';
import { CompactDialog, FormMessage, NavIcon, QueryMessage, Select, SettingsAction, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';
import { columnsQuery, deleteColumn, projectQuery, refreshProjects, reorderColumns, type BoardColumn, type Project } from '@/entities/project';
import { CATEGORY_LABELS, StatusBadge, statusSteps } from '@/entities/work-item';
import { ColumnDialog } from './ColumnDialog';
import styles from './project-settings.module.css';

const BACKLOG = 'backlog';
const COLUMN = { word: '상태', object: '상태를', topic: '상태는' };

/**
 * 워크플로: the project's board columns in order, each its category's mark, name and category, the one that finishes work
 * marked (D-049: at least one, and never the last column removed). A column is put in its place by its grip
 * (useRowReorder: carried by mouse or finger, or Alt + ↑ / ↓). 상태 추가 and 고치기 open the same short dialog; 삭제 asks
 * where the column's work items go (another column, or the backlog column, D-111).
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
  const reorder = useRowReorder(list, COLUMN, rows.ghost, async order => {
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
    <SettingsHead title="워크플로" description="업무가 진행되는 상태와 순서를 정합니다. 완료 상태에 들어간 업무는 끝난 것으로 셉니다." />
    {!columns.data ? <QueryMessage pending={columns.isPending} error={columns.error} retry={() => { void columns.refetch(); }} />
      : <SettingsCard title={`상태 ${list.length}개`} id="board-columns"
        actions={editable ? <Button label="상태 추가" variant="secondary" size="sm" icon={<NavIcon name="plus" />} onClick={() => setEditing('new')} /> : undefined}>
        <div ref={reorder.list} className={rows.list} role="list" aria-label="워크플로 상태 순서">
          {shown.map(column => <div key={column.id} className={rows.row} role="listitem" {...reorder.rowProps(column.id)}>
            <SettingsRow lead={<span className={styles.lead}>
              {editable && <button type="button" className={rows.grip} {...reorder.gripProps(column)}><NavIcon name="grip" /></button>}
              <StatusBadge category={column.category} step={statusSteps(shown).get(column.id)} isLabelHidden />
            </span>}
            label={<>{column.name}{column.isFinal && <> <StatusToken label="완료 상태" color="green" /></>}</>} description={CATEGORY_LABELS[column.category]}>
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
    <CompactDialog isOpen={!!removing} title={`'${removing?.name ?? ''}' 상태를 지울까요?`} width={520} isBusy={isBusy} onClose={() => { if (!isBusy) setRemoving(null); }}
      footer={<><Button label="취소" variant="ghost" onClick={() => setRemoving(null)} isDisabled={isBusy} /><Button label="옮기고 지우기" variant="destructive" isLoading={isBusy} onClick={() => { void remove(); }} /></>}>
      <Select label="이 상태의 업무를 옮길 곳" value={moveTo} onChange={value => setMoveTo(value ?? BACKLOG)}
        options={[{ value: BACKLOG, label: '백로그 칸' }, ...list.filter(column => column.id !== removing?.id).map(column => ({ value: column.id, label: column.name }))]} />
    </CompactDialog>
  </VStack>;
}
