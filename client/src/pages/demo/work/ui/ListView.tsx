import { Link } from '@tanstack/react-router';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, PageState } from '@/shared/ui';
import { demoStyles, PersonCell, PriorityMark, PRIORITY_RANK, projectOf, StatusBadge, type Status, type WorkItem, type WorkSearch } from '@/entities/demo-sample';

const STATUS_RANK: Record<Status, number> = { doing: 0, review: 1, todo: 2, done: 3 };

/**
 * The 목록 view: the work as rows read by their titles (ItemList), what is moving first and then the most pressing: the
 * key as the lead, then its status, priority, assignee and, across the whole workspace, its project. A phone reads the
 * same rows as cards.
 */
export function ListView({ workspaceId, items, search, isScoped }: { workspaceId: string; items: WorkItem[]; search: WorkSearch; isScoped: boolean }) {
  const rows = [...items].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  if (rows.length === 0) return <PageState title="보일 작업이 없습니다" description="조건을 바꾸거나 새 작업을 만들어 보세요." />;
  return <ItemList label="작업 목록">{rows.map(item => <ItemRow key={item.id} lead={<span className={demoStyles.key}>{item.key}</span>}
    title={<Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} search={search} className={ITEM_ROW_LINK}>{item.title}</Link>}
    meta={<>
      {!isScoped && <ItemMeta width="6.5rem"><span className={demoStyles.clip}>{projectOf(item.projectId)?.name}</span></ItemMeta>}
      <ItemMeta width="5.5rem"><StatusBadge status={item.status} /></ItemMeta>
      <ItemMeta width="5rem"><PriorityMark priority={item.priority} /></ItemMeta>
      <ItemMeta width="8rem"><PersonCell id={item.assigneeId} /></ItemMeta>
    </>} />)}
  </ItemList>;
}
