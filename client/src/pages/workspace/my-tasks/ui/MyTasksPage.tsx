import { Button, Text } from '@astryxdesign/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { myTasksQuery, WorkItemList } from '@/entities/work-item';
import { TaskFilters, ActiveTaskFilters, activeFilterKeys, filterParams, type TaskSearch } from '@/features/work-item-filters';
import { PageFrame, QueryMessage } from '@/shared/ui';
export function MyTasksPage() {
  const { workspaceId = '' } = useParams({ strict: false }); const search = useSearch({ from: '/workspace/w/$workspaceId/my-tasks' }); const navigate = useNavigate();
  const result = useInfiniteQuery(myTasksQuery(workspaceId, filterParams(search))); const items = result.error ? [] : result.data?.pages.flatMap(page => page.items) ?? [];
  const change = (value: TaskSearch) => { void navigate({ to: '/w/$workspaceId/my-tasks', params: { workspaceId }, search: { ...value, order: value.order === 'position_asc' ? 'createdAt_desc' : value.order } }); };
  return <PageFrame title="내 작업" width="full" tools={<TaskFilters workspaceId={workspaceId} value={search} onChange={change} mine canWrite={false} />} conditions={activeFilterKeys(search).length > 0 && <ActiveTaskFilters value={search} onChange={change} />}>
    <Text color="secondary">보관되지 않은 프로젝트에서 내가 담당하는 작업입니다.</Text>
    <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
    {!result.isPending && !result.error && !items.length && <Text color="secondary">조건에 맞는 내 작업이 없습니다.</Text>}
    {!!items.length && <WorkItemList items={items} />}
    {result.hasNextPage && <Button label="작업 더 불러오기" isLoading={result.isFetchingNextPage} onClick={() => { void result.fetchNextPage(); }} />}
  </PageFrame>;
}
