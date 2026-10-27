import { useMemo, type ReactNode } from 'react';
import { SHEET_ROW_LINK, SheetTable, type ListSort, type SheetColumn } from '@/shared/ui';
import { dateText } from '@/shared/lib/date-text';
import type { WorkItem } from '../api/work-item';
import type { WorkItemSearch } from '../model/search';
import type { ViewColumn } from '../model/views';
import { WorkItemLink } from './WorkItemLink';
import { LabelTokens } from './LabelTokens';
import { PersonCell } from './PersonCell';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './work-item.module.css';

/**
 * A desktop's work items as the list (D-064), each property a column the view shows (D-066): the key and title link the
 * row to the work item's page, carrying the view and its conditions so the way back returns to the same list; a work item
 * without a property leaves its cell empty. Headers with a sortKey set the order. A project's list names each status
 * by its column (columnNames); 전체 by the column's category.
 */
export function WorkItemTable({ workspaceId, rows, search, columns, columnNames, order, foot, badges }: {
  workspaceId: string; rows: WorkItem[]; search: WorkItemSearch; columns: readonly ViewColumn[]; columnNames?: ReadonlyMap<string, string>; order: ListSort; foot?: ReactNode;
  /** What another part of the app adds after a work item's title (its pull requests, D-087), by work item id. */
  badges?: ReadonlyMap<string, ReactNode>;
}) {
  const sheet = useMemo<SheetColumn<WorkItem>[]>(() => {
    const cells: Record<ViewColumn, Omit<SheetColumn<WorkItem>, 'key'>> = {
      status: { header: '상태', width: '8rem', render: row => (row.columnCategory ? <StatusBadge category={row.columnCategory} name={row.columnId ? columnNames?.get(row.columnId) : undefined} /> : null) },
      priority: { header: '우선순위', width: '7rem', sortKey: 'priority', render: row => (row.priority ? <PriorityMark priority={row.priority} /> : null) },
      assignee: { header: '사람', width: '9rem', render: row => <PersonCell people={row.people} /> },
      labels: { header: '라벨', width: '11rem', render: row => <LabelTokens labels={row.labels} /> },
      due: { header: '기한', width: '7rem', render: row => (row.dueDate ? dateText(row.dueDate) : null) },
      updated: { header: '수정일', width: '7rem', sortKey: 'updated', render: row => dateText(row.updatedAt) },
      created: { header: '만든 날', width: '7rem', sortKey: 'created', render: row => dateText(row.createdAt) },
    };
    return [
      { key: 'title', header: '제목', sortKey: 'title', render: row => <>
        <span className={styles.key}>{row.key}</span>
        <WorkItemLink workspaceId={workspaceId} item={row} search={search} className={SHEET_ROW_LINK}>{row.title}</WorkItemLink>
        {badges?.get(row.id)}
      </> },
      ...columns.map(column => ({ key: column, ...cells[column] })),
    ];
  }, [workspaceId, search, columns, columnNames, badges]);
  return <SheetTable label="업무 목록" columns={sheet} rows={rows} rowKey={row => row.id} order={order} minWidth={`${24 + columns.length * 7}rem`} foot={foot} />;
}
