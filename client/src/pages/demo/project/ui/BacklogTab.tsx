import { Link } from '@tanstack/react-router';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListToolbar, PageState } from '@/shared/ui';
import { dateText, demoStyles, PersonCell, PriorityMark, PRIORITY_RANK, projectOf, WORK_ITEMS, type WorkSearch } from '@/entities/demo-sample';
import type { Scope } from '../model/scope';

/**
 * The 백로그 tab: the scope's work not started yet, the most pressing first, as rows read by their titles (ItemList)
 * on a desktop as on a phone, as Kaneo's backlog: the only list here that is not a table (D-064). A row leads with its
 * key and ends with its priority, assignee and due day; 전체 names each row's project too.
 */
export function BacklogTab({ scope, search, go, onCreate }: { scope: Scope; search: WorkSearch; go: (patch: Partial<WorkSearch>, replace?: boolean) => void; onCreate?: () => void }) {
  const { workspaceId, project, projectIds } = scope;
  const rows = WORK_ITEMS.filter(item => projectIds.includes(item.projectId) && item.status === 'todo')
    .filter(item => !search.q || item.title.includes(search.q) || item.key.includes(search.q.toUpperCase()))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  return <>
    <ListToolbar search={{ label: '백로그 검색', placeholder: '제목이나 키로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      action={onCreate && { label: '새 작업', icon: 'plus', isCreate: true, onClick: onCreate }} />
    {rows.length === 0
      ? <PageState kind={search.q ? 'search' : 'empty'} title={search.q ? `'${search.q}'에 맞는 작업이 없습니다` : '백로그가 비었습니다'}
        description={search.q ? '다른 낱말로 찾아보세요.' : '시작하지 않은 작업이 여기에 모입니다.'} />
      : <ItemList label="백로그">{rows.map(item => <ItemRow key={item.id} lead={<span className={demoStyles.key}>{item.key}</span>}
        title={<Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} search={search} className={ITEM_ROW_LINK}>{item.title}</Link>}
        meta={<>
          {!project && <ItemMeta width="7rem"><span className={demoStyles.clip}>{projectOf(item.projectId)?.name}</span></ItemMeta>}
          <ItemMeta width="5rem"><PriorityMark priority={item.priority} /></ItemMeta>
          <ItemMeta width="8rem"><PersonCell id={item.assigneeId} /></ItemMeta>
          <ItemMeta width="6rem" align="end">{item.dueAt ? dateText(item.dueAt) : <span className={demoStyles.none}>마감 없음</span>}</ItemMeta>
        </>} />)}
      </ItemList>}
  </>;
}
