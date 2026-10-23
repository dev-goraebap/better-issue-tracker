import { useState, type DragEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { BoardColumn as Column } from '@/entities/project';
import { countsQuery, moveItem, refreshItems, type TaskFilters, type WorkItem } from '@/entities/work-item';
import { authError } from '@/shared/api';
import { FormMessage } from '@/shared/ui';
import { BoardColumn } from './BoardColumn';
import styles from './work-items.module.css';
export function WorkBoard({ workspaceId, projectId, columns, filters, canWrite, onCreate }: { workspaceId: string; projectId: string; columns: Column[]; filters: TaskFilters; canWrite: boolean; onCreate: (column: string) => void }) {
  const counts = useQuery(countsQuery(workspaceId, projectId, filters)); const [dragged, setDragged] = useState<WorkItem | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  async function move(item: WorkItem, column: string, before?: WorkItem, after?: WorkItem) { if (busy || !canWrite || item.deletedAt || item.id === before?.id || item.id === after?.id) return; setBusy(true); setError(''); try { await moveItem(workspaceId, projectId, item.id, { expectedVersion: item.version, targetColumnId: column, beforeItemId: before?.id, afterItemId: after?.id }); } catch (failure) { setError(authError(failure)); } await refreshItems(client, workspaceId, projectId); setBusy(false); }
  function drop(event: DragEvent, column: string, before?: WorkItem, after?: WorkItem) { event.preventDefault(); if (!dragged || event.dataTransfer.getData('application/x-bit-work-item') !== dragged.id) return; const item = dragged; setDragged(null); void move(item, column, before, after?.id === item.id ? undefined : after); }
  return <><FormMessage message={error} /><FormMessage message={counts.error ? '건수를 불러오지 못했습니다. 목록의 작업은 계속 확인할 수 있습니다.' : ''} />
    <section className={styles.board} aria-label="작업 보드">{columns.map(column => <BoardColumn key={column.id} workspaceId={workspaceId} projectId={projectId} column={column} columns={columns} filters={filters} count={counts.data ? counts.data.find(c => c.columnId === column.id)?.count ?? 0 : undefined} canWrite={canWrite} busy={busy} onCreate={() => onCreate(column.id)} onDrag={setDragged} drop={drop} move={(...args) => { void move(...args); }} />)}</section>
  </>;
}
