import { useState } from 'react';
import { Button, HStack, Text } from '@astryxdesign/core';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { columnsQuery, projectQuery } from '@/entities/project';
import { itemsQuery, WorkItemList } from '@/entities/work-item';
import { workspaceQuery } from '@/entities/workspace';
import { TaskFilters, ActiveTaskFilters, activeFilterKeys, filterParams, type TaskSearch } from '@/features/work-item-filters';
import { PageFrame, QueryMessage } from '@/shared/ui';
import { CreateWorkItemDialog } from './CreateWorkItemDialog';
import { WorkBoard } from './WorkBoard';
import { WorkTimeline } from './WorkTimeline';
import { WorkItemActions } from './WorkItemActions';
import styles from './work-items.module.css';
export function WorkItemsPage() {
  const { workspaceId = '', projectId = '' } = useParams({ strict: false }); const search = useSearch({ from: '/workspace/w/$workspaceId/p/$projectId' }); const navigate = useNavigate();
  const project = useQuery(projectQuery(workspaceId, projectId)); const columns = useQuery(columnsQuery(workspaceId, projectId)); const space = useQuery(workspaceQuery(workspaceId));
  const [creating, setCreating] = useState(false); const [initialColumn, setInitialColumn] = useState<string | null>(null);
  const canWrite = !!project.data && !!space.data && !project.error && !space.error && !project.data.archivedAt && space.data.myRole !== 'viewer';
  const filters = { ...filterParams(search), ...(search.view === 'backlog' ? { column: 'backlog' } : {}) };
  const result = useInfiniteQuery({ ...itemsQuery(workspaceId, projectId, filters), enabled: search.view !== 'board' && !!project.data && !project.error }); const items = result.error ? [] : result.data?.pages.flatMap(page => page.items) ?? [];
  const change = (value: TaskSearch) => { void navigate({ to: '/w/$workspaceId/p/$projectId', params: { workspaceId, projectId }, search: { ...value, view: search.view } }); };
  const create = (column: string | null) => { setInitialColumn(column); setCreating(true); };
  return <PageFrame title={project.data?.name ?? '프로젝트'} width="full" actions={<HStack gap={2}>{canWrite && <Button label="작업 만들기" variant="primary" onClick={() => create(search.view === 'backlog' ? null : columns.data?.[0]?.id ?? null)} />}<Link to="/w/$workspaceId/settings/projects/$projectId/general" params={{ workspaceId, projectId }}>설정</Link></HStack>}
    tabs={<nav className={styles.tabs} aria-label="프로젝트 보기">{([['board', '보드'], ['list', '목록'], ['backlog', '백로그'], ['timeline', '일정']] as const).map(([view, label]) => <Link key={view} to="/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId }} search={{ ...search, view }} aria-current={search.view === view ? 'page' : undefined}>{label}</Link>)}</nav>}
    tools={<TaskFilters workspaceId={workspaceId} value={search} columns={columns.data} canWrite={!!space.data && space.data.myRole !== 'viewer'} board={search.view === 'board' || search.view === 'backlog'} onChange={change} />}
    conditions={activeFilterKeys(search).length > 0 && <ActiveTaskFilters value={search} onChange={change} />}>
    <QueryMessage pending={project.isPending} error={project.error} retry={() => { void project.refetch(); }} /><QueryMessage pending={columns.isPending} error={columns.error} retry={() => { void columns.refetch(); }} />
    {search.mode === 'deleted' && <Text color="secondary">삭제된 작업은 컬럼 유무와 관계없이 목록으로 표시합니다. 복원하면 원래 컬럼 또는 백로그로 돌아갑니다.</Text>}
    {project.data?.archivedAt && <Text color="secondary">보관한 프로젝트입니다. 조회만 가능하며 설정에서 보관을 해제할 수 있습니다.</Text>}
    {!!project.data && !project.error && columns.data && !columns.error && <>{search.view === 'board' ? <WorkBoard workspaceId={workspaceId} projectId={projectId} columns={columns.data} filters={filters} canWrite={canWrite} onCreate={create} /> : <>
      <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
      {!result.isPending && !result.error && !items.length && <Text color="secondary">조건에 맞는 작업이 없습니다.</Text>}
      {!!items.length && (search.view === 'timeline' ? <WorkTimeline items={items} /> : <WorkItemList items={items} columnNames={Object.fromEntries(columns.data.map(c => [c.id, c.name]))} actions={canWrite ? item => <WorkItemActions item={item} columns={columns.data} /> : undefined} />)}
      {result.hasNextPage && <Button label="작업 더 불러오기" onClick={() => { void result.fetchNextPage(); }} isLoading={result.isFetchingNextPage} />}
    </>}</>}
    <CreateWorkItemDialog workspaceId={workspaceId} projectId={projectId} columns={columns.data ?? []} open={creating} initialColumn={initialColumn} onClose={() => setCreating(false)} />
  </PageFrame>;
}
