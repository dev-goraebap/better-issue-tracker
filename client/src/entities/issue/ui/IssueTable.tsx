import { useMemo, type ReactNode } from 'react';
import { SHEET_ROW_LINK, SheetTable, type ListSort, type SheetColumn } from '@/shared/ui';
import { dateText } from '@/shared/lib/date-text';
import type { Issue } from '../api/issue';
import type { IssueSearch } from '../model/search';
import type { ViewColumn } from '../model/views';
import { IssueLink } from './IssueLink';
import { LabelTokens } from './LabelTokens';
import { PersonCell } from './PersonCell';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './issue.module.css';

/**
 * A desktop's issues as the list (D-064), each property a column the view shows (D-066): the key and title link the
 * row to the issue's page, carrying the view and its conditions so the way back returns to the same list; an issue
 * without a property leaves its cell empty. Headers with a sortKey set the order. A project's list names each status
 * by its column (columnNames); 전체 by the column's category.
 */
export function IssueTable({ workspaceId, rows, search, columns, columnNames, order, foot }: {
  workspaceId: string; rows: Issue[]; search: IssueSearch; columns: readonly ViewColumn[]; columnNames?: ReadonlyMap<string, string>; order: ListSort; foot?: ReactNode;
}) {
  const sheet = useMemo<SheetColumn<Issue>[]>(() => {
    const cells: Record<ViewColumn, Omit<SheetColumn<Issue>, 'key'>> = {
      status: { header: '상태', width: '8rem', render: row => (row.columnCategory ? <StatusBadge category={row.columnCategory} name={row.columnId ? columnNames?.get(row.columnId) : undefined} /> : null) },
      priority: { header: '우선순위', width: '7rem', sortKey: 'priority', render: row => (row.priority ? <PriorityMark priority={row.priority} /> : null) },
      assignee: { header: '담당자', width: '9rem', render: row => <PersonCell id={row.assigneeId} name={row.assigneeName} /> },
      labels: { header: '라벨', width: '11rem', render: row => <LabelTokens labels={row.labels} /> },
      due: { header: '기한', width: '7rem', render: row => (row.dueDate ? dateText(row.dueDate) : null) },
      updated: { header: '수정일', width: '7rem', sortKey: 'updated', render: row => dateText(row.updatedAt) },
      created: { header: '만든 날', width: '7rem', sortKey: 'created', render: row => dateText(row.createdAt) },
    };
    return [
      { key: 'title', header: '제목', sortKey: 'title', render: row => <>
        <span className={styles.key}>{row.key}</span>
        <IssueLink workspaceId={workspaceId} item={row} search={search} className={SHEET_ROW_LINK}>{row.title}</IssueLink>
      </> },
      ...columns.map(column => ({ key: column, ...cells[column] })),
    ];
  }, [workspaceId, search, columns, columnNames]);
  return <SheetTable label="이슈 목록" columns={sheet} rows={rows} rowKey={row => row.id} order={order} minWidth={`${24 + columns.length * 7}rem`} foot={foot} />;
}
