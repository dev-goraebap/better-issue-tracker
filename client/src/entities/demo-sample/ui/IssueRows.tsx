import { Link } from '@tanstack/react-router';
import { DefaultAvatar, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, NavIcon } from '@/shared/ui';
import { dateText, personOf } from '../model/mock';
import type { Issue } from '../model/issues';
import type { IssueSearch } from '../model/search';
import type { ViewColumn } from '../model/views';
import { LabelTokens } from './LabelTokens';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './demo.module.css';

/**
 * A phone's issues as small cards (ItemRow on a phone): the assignee's picture as the lead, the title over its key and
 * the properties the view shows that the issue has. The whole card opens the issue's page.
 */
export function IssueRows({ workspaceId, rows, search, columns }: { workspaceId: string; rows: Issue[]; search: IssueSearch; columns: readonly ViewColumn[] }) {
  const shows = (column: ViewColumn) => columns.includes(column);
  return <ItemList label="이슈 목록">{rows.map(row => {
    const person = personOf(row.assigneeId);
    return <ItemRow key={row.id}
      lead={person ? <DefaultAvatar seed={person.id} name={person.name} size={32} /> : <span className={styles.leadEmpty} aria-hidden="true" />}
      title={<Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: row.projectId, workItemId: row.id }} search={search} className={ITEM_ROW_LINK}>{row.title}</Link>}
      meta={<>
        <ItemMeta><span className={styles.key}>{row.key}</span></ItemMeta>
        {shows('status') && row.status && <ItemMeta><StatusBadge status={row.status} /></ItemMeta>}
        {shows('priority') && row.priority && <ItemMeta><PriorityMark priority={row.priority} /></ItemMeta>}
        {shows('labels') && row.labels.length > 0 && <ItemMeta><LabelTokens labels={row.labels.slice(0, 2)} /></ItemMeta>}
        {shows('due') && row.dueAt && <ItemMeta label={`기한 ${dateText(row.dueAt)}`}><NavIcon name="calendar" />{dateText(row.dueAt)}</ItemMeta>}
        <ItemMeta label={`수정 ${dateText(row.updatedAt)}`}>{dateText(row.updatedAt)}</ItemMeta>
      </>} />;
  })}</ItemList>;
}
