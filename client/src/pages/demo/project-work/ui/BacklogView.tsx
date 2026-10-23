import { Link } from '@tanstack/react-router';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, PageState } from '@/shared/ui';
import { demoStyles, PersonCell, PriorityMark, PRIORITY_RANK, type WorkItem, type WorkSearch } from '@/entities/demo-sample';

/**
 * The backlog view: what is not started yet, the most pressing first, as rows read by their titles (ItemList): the key
 * as the lead, priority and assignee at the end. A phone reads the same rows as cards.
 */
export function BacklogView({ workspaceId, items, search }: { workspaceId: string; items: WorkItem[]; search: WorkSearch }) {
  const rows = items.filter(item => item.status === 'todo').sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  if (rows.length === 0) return <PageState title="백로그가 비었습니다" description="시작하지 않은 작업이 여기에 모입니다." />;
  return <ItemList label="백로그">{rows.map(item => <ItemRow key={item.id} lead={<span className={demoStyles.key}>{item.key}</span>}
    title={<Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} search={search} className={ITEM_ROW_LINK}>{item.title}</Link>}
    meta={<><ItemMeta width="5rem"><PriorityMark priority={item.priority} /></ItemMeta><ItemMeta width="8rem"><PersonCell id={item.assigneeId} /></ItemMeta></>} />)}
  </ItemList>;
}
