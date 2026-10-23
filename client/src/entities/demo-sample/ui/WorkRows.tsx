import { Link } from '@tanstack/react-router';
import { DefaultAvatar, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow } from '@/shared/ui';
import { dateText, personOf, type WorkItem } from '../model/mock';
import type { WorkSearch } from '../model/search';
import { PriorityMark } from './PriorityMark';
import { StatusBadge } from './StatusBadge';
import styles from './demo.module.css';

/**
 * A phone's work items as small cards (ItemRow on a phone): the assignee's picture as the lead, the title over its key,
 * status, priority and date. The whole card opens the item's page.
 */
export function WorkRows({ workspaceId, rows, search }: { workspaceId: string; rows: WorkItem[]; search: WorkSearch }) {
  return <ItemList label="작업 목록">{rows.map(row => {
    const person = personOf(row.assigneeId);
    return <ItemRow key={row.id}
      lead={person ? <DefaultAvatar seed={person.id} name={person.name} size={32} /> : <span className={styles.leadEmpty} aria-hidden="true" />}
      title={<Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: row.projectId, workItemId: row.id }} search={search} className={ITEM_ROW_LINK}>{row.title}</Link>}
      meta={<><ItemMeta><span className={styles.key}>{row.key}</span></ItemMeta><ItemMeta><StatusBadge status={row.status} /></ItemMeta>
        <ItemMeta><PriorityMark priority={row.priority} /></ItemMeta><ItemMeta label={`수정 ${dateText(row.updatedAt)}`}>{dateText(row.updatedAt)}</ItemMeta></>} />;
  })}</ItemList>;
}
