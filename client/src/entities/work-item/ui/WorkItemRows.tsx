import type { ReactNode } from 'react';
import { DefaultAvatar, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, NavIcon } from '@/shared/ui';
import { dateText } from '@/shared/lib/date-text';
import type { WorkItem } from '../api/work-item';
import type { WorkItemSearch } from '../model/search';
import type { ViewColumn } from '../model/views';
import { WorkItemLink } from './WorkItemLink';
import { LabelTokens } from './LabelTokens';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './work-item.module.css';

/**
 * A phone's work items as small cards (ItemRow on a phone): the assignee's picture as the lead, the title over its key and
 * the properties the view shows that the work item has. The whole card opens the work item's page.
 */
export function WorkItemRows({ workspaceId, rows, search, columns, columnNames, badges }: {
  workspaceId: string; rows: WorkItem[]; search: WorkItemSearch; columns: readonly ViewColumn[]; columnNames?: ReadonlyMap<string, string>;
  /** What another part of the app adds to a work item (its pull requests, D-087), by work item id. */
  badges?: ReadonlyMap<string, ReactNode>;
}) {
  const shows = (column: ViewColumn) => columns.includes(column);
  return <ItemList label="업무 목록">{rows.map(row => <ItemRow key={row.id}
    lead={row.people[0] ? <DefaultAvatar seed={row.people[0].id} name={row.people[0].name} size={32} /> : <span className={styles.leadEmpty} aria-hidden="true" />}
    title={<WorkItemLink workspaceId={workspaceId} item={row} search={search} className={ITEM_ROW_LINK}>{row.title}</WorkItemLink>}
    meta={<>
      <ItemMeta><span className={styles.key}>{row.key}</span></ItemMeta>
      {badges?.get(row.id) && <ItemMeta>{badges.get(row.id)}</ItemMeta>}
      {shows('status') && row.columnCategory && <ItemMeta><StatusBadge category={row.columnCategory} name={row.columnId ? columnNames?.get(row.columnId) : undefined} /></ItemMeta>}
      {shows('priority') && row.priority && <ItemMeta><PriorityMark priority={row.priority} /></ItemMeta>}
      {shows('labels') && row.labels.length > 0 && <ItemMeta><LabelTokens labels={row.labels.slice(0, 2)} /></ItemMeta>}
      {shows('due') && row.dueDate && <ItemMeta label={`기한 ${dateText(row.dueDate)}`}><NavIcon name="calendar" />{dateText(row.dueDate)}</ItemMeta>}
      <ItemMeta label={`수정 ${dateText(row.updatedAt)}`}>{dateText(row.updatedAt)}</ItemMeta>
    </>} />)}</ItemList>;
}
