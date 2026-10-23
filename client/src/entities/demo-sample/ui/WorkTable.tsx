import { useMemo, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { NavIcon, SHEET_ROW_LINK, SheetTable, type ListSort, type SheetColumn } from '@/shared/ui';
import { dateText, type WorkItem } from '../model/mock';
import type { WorkSearch } from '../model/search';
import { LabelTokens } from './LabelTokens';
import { PersonCell } from './PersonCell';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './demo.module.css';

/**
 * A desktop's work items as Plane's spreadsheet: the key and title link the row to the item's page (carrying the list's
 * conditions, so the way back returns to the same list), the headers with a sortKey set the order, foot ends the list.
 */
export function WorkTable({ workspaceId, rows, search, order, foot }: { workspaceId: string; rows: WorkItem[]; search: WorkSearch; order: ListSort; foot?: ReactNode }) {
  const columns = useMemo<SheetColumn<WorkItem>[]>(() => [
    { key: 'title', header: '제목', sortKey: 'title', render: row => <>
      <span className={styles.key}>{row.key}</span>
      <Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: row.projectId, workItemId: row.id }} search={search} className={SHEET_ROW_LINK}>{row.title}</Link>
    </> },
    { key: 'status', header: '상태', width: '7rem', render: row => <StatusBadge status={row.status} /> },
    { key: 'priority', header: '우선순위', width: '7rem', sortKey: 'priority', render: row => <PriorityMark priority={row.priority} /> },
    { key: 'assignee', header: '담당자', width: '9rem', render: row => <PersonCell id={row.assigneeId} /> },
    { key: 'labels', header: '라벨', width: '10rem', render: row => <LabelTokens labels={row.labels} /> },
    { key: 'comments', header: '댓글', width: '5rem', align: 'end', render: row => row.comments > 0
      ? <span className={styles.figure} aria-label={`댓글 ${row.comments}개`}><NavIcon name="comment" />{row.comments}</span> : null },
    { key: 'updated', header: '수정일', width: '8rem', sortKey: 'updated', render: row => dateText(row.updatedAt) },
  ], [workspaceId, search]);
  return <SheetTable label="작업 목록" columns={columns} rows={rows} rowKey={row => row.id} order={order} minWidth="60rem" foot={foot} />;
}
