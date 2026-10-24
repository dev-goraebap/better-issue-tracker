import { useMemo, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { NavIcon, SHEET_ROW_LINK, SheetTable, type ListSort, type SheetColumn } from '@/shared/ui';
import { dateText } from '../model/mock';
import type { Issue } from '../model/issues';
import type { IssueSearch } from '../model/search';
import type { ViewColumn } from '../model/views';
import { LabelTokens } from './LabelTokens';
import { PersonCell } from './PersonCell';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './demo.module.css';

const COLUMNS: Record<ViewColumn, Omit<SheetColumn<Issue>, 'key'>> = {
  status: { header: '상태', width: '7rem', render: row => (row.status ? <StatusBadge status={row.status} /> : null) },
  priority: { header: '우선순위', width: '7rem', sortKey: 'priority', render: row => (row.priority ? <PriorityMark priority={row.priority} /> : null) },
  assignee: { header: '담당자', width: '9rem', render: row => (row.assigneeId || row.status ? <PersonCell id={row.assigneeId} /> : null) },
  labels: { header: '라벨', width: '11rem', render: row => <LabelTokens labels={row.labels} /> },
  due: { header: '기한', width: '7rem', render: row => (row.dueAt ? dateText(row.dueAt) : null) },
  comments: { header: '댓글', width: '5rem', align: 'end', render: row => (row.comments > 0
    ? <span className={styles.figure} aria-label={`댓글 ${row.comments}개`}><NavIcon name="comment" />{row.comments}</span> : null) },
  updated: { header: '수정일', width: '7rem', sortKey: 'updated', render: row => dateText(row.updatedAt) },
  created: { header: '만든 날', width: '7rem', sortKey: 'created', render: row => dateText(row.createdAt) },
};

/**
 * A desktop's issues as the list (D-064), each property a column the view shows (D-066): the key and title link the
 * row to the issue's page, carrying the view and its conditions so the way back returns to the same list; an issue
 * without a property leaves its cell empty. Headers with a sortKey set the order.
 */
export function IssueTable({ workspaceId, rows, search, columns, order, foot }: {
  workspaceId: string; rows: Issue[]; search: IssueSearch; columns: readonly ViewColumn[]; order: ListSort; foot?: ReactNode;
}) {
  const sheet = useMemo<SheetColumn<Issue>[]>(() => [
    { key: 'title', header: '제목', sortKey: 'title', render: row => <>
      <span className={styles.key}>{row.key}</span>
      <Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: row.projectId, workItemId: row.id }} search={search} className={SHEET_ROW_LINK}>{row.title}</Link>
    </> },
    ...columns.map(column => ({ key: column, ...COLUMNS[column] })),
  ], [workspaceId, search, columns]);
  return <SheetTable label="이슈 목록" columns={sheet} rows={rows} rowKey={row => row.id} order={order} minWidth={`${24 + columns.length * 7}rem`} foot={foot} />;
}
