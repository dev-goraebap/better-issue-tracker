import { DefaultAvatar, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, NavIcon } from '@/shared/ui';
import { dateText } from '@/shared/lib/date-text';
import type { Issue } from '../api/issue';
import type { IssueSearch } from '../model/search';
import type { ViewColumn } from '../model/views';
import { IssueLink } from './IssueLink';
import { LabelTokens } from './LabelTokens';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './issue.module.css';

/**
 * A phone's issues as small cards (ItemRow on a phone): the assignee's picture as the lead, the title over its key and
 * the properties the view shows that the issue has. The whole card opens the issue's page.
 */
export function IssueRows({ workspaceId, rows, search, columns, columnNames }: {
  workspaceId: string; rows: Issue[]; search: IssueSearch; columns: readonly ViewColumn[]; columnNames?: ReadonlyMap<string, string>;
}) {
  const shows = (column: ViewColumn) => columns.includes(column);
  return <ItemList label="이슈 목록">{rows.map(row => <ItemRow key={row.id}
    lead={row.assigneeId ? <DefaultAvatar seed={row.assigneeId} name={row.assigneeName ?? ''} size={32} /> : <span className={styles.leadEmpty} aria-hidden="true" />}
    title={<IssueLink workspaceId={workspaceId} item={row} search={search} className={ITEM_ROW_LINK}>{row.title}</IssueLink>}
    meta={<>
      <ItemMeta><span className={styles.key}>{row.key}</span></ItemMeta>
      {shows('status') && row.columnCategory && <ItemMeta><StatusBadge category={row.columnCategory} name={row.columnId ? columnNames?.get(row.columnId) : undefined} /></ItemMeta>}
      {shows('priority') && row.priority && <ItemMeta><PriorityMark priority={row.priority} /></ItemMeta>}
      {shows('labels') && row.labels.length > 0 && <ItemMeta><LabelTokens labels={row.labels.slice(0, 2)} /></ItemMeta>}
      {shows('due') && row.dueDate && <ItemMeta label={`기한 ${dateText(row.dueDate)}`}><NavIcon name="calendar" />{dateText(row.dueDate)}</ItemMeta>}
      <ItemMeta label={`수정 ${dateText(row.updatedAt)}`}>{dateText(row.updatedAt)}</ItemMeta>
    </>} />)}</ItemList>;
}
