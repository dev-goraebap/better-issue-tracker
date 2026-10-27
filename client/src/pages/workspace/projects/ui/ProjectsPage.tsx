import { useCallback, useId, useMemo, useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { authError } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import {
  MoreMenu,
  FormMessage, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListMore, ListToolbar, NavIcon, PageFrame, PageState, PageTabs, QueryMessage, SHEET_ROW_LINK, SheetTable, type PageTab, type SheetColumn,
} from '@/shared/ui';
import { ProjectMark, projectsQuery, refreshProjects, reorderProjects, restoreProject, type Project, type ProjectStatus } from '@/entities/project';
import { canManage as canManageIn, canWrite as canWriteIn, workspaceQuery } from '@/entities/workspace';
import { CreateProjectDialog } from '@/features/project-create';
import type { ProjectsSearch } from '../model/search';
import styles from './projects.module.css';


/**
 * PATTERN · 탭 목록 (모든 프로젝트), /workspaces/$workspaceId/projects (?status=archived|deleted). Projects as a table: the name
 * links the row to the project's work items, its key, description and when it changed; archived ones in their own tab, and
 * for the owner and admins the deleted ones, each restorable. A phone reads them as cards.
 * - Projects read in the workspace's order (D-080). The owner and admins move one up or down from its row's menu (the
 *   sidebar's drag on a desktop does the same), on the whole list unsearched.
 */
export function ProjectsPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const search = useSearch({ strict: false }) as ProjectsSearch;
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const navigate = useNavigate();
  const client = useQueryClient();
  const panelId = useId();
  const role = useQuery(workspaceQuery(workspaceId)).data;
  const canManage = canManageIn(role);
  const canWrite = canWriteIn(role, 'EDIT_SETTINGS');
  const tab: ProjectStatus = search.status ?? 'active';
  const result = useInfiniteQuery(projectsQuery(workspaceId, tab, search.q ?? ''));
  const rows = useMemo(() => result.data?.pages.flatMap(page => page.items) ?? [], [result.data]);
  const [isCreating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState('');
  const [error, setError] = useState('');
  const go = useCallback((patch: Partial<ProjectsSearch>, replace = false) => void navigate({
    to: '/workspaces/$workspaceId/projects', params: { workspaceId }, replace,
    search: Object.fromEntries(Object.entries({ ...search, ...patch }).filter(([, value]) => value !== undefined && value !== '')),
  }), [navigate, workspaceId, search]);
  const restore = async (project: Project) => {
    setRestoring(project.id); setError('');
    try { await restoreProject(workspaceId, project.id, project.version); }
    catch (failure) { setError(authError(failure)); }
    finally { setRestoring(''); await refreshProjects(client, workspaceId); }
  };
  // The order is the whole list's: it moves while every active project is in view and none is searched away.
  const canOrder = canManage && tab === 'active' && !search.q && !result.hasNextPage && rows.length > 1;
  const move = async (from: number, by: number) => {
    const order = rows.map(row => row.id);
    [order[from], order[from + by]] = [order[from + by]!, order[from]!];
    setError('');
    try { await reorderProjects(workspaceId, order); }
    catch (failure) { setError(authError(failure)); }
    finally { await refreshProjects(client, workspaceId); }
  };
  const orderMenu = (row: Project) => {
    const at = rows.indexOf(row);
    return <MoreMenu label={`${row.name} 메뉴`} variant="ghost" size="sm" placement="end" items={[
      ...(at > 0 ? [{ label: '위로 옮기기', icon: <NavIcon name="sort" />, onClick: () => { void move(at, -1); } }] : []),
      ...(at < rows.length - 1 ? [{ label: '아래로 옮기기', icon: <NavIcon name="sort" />, onClick: () => { void move(at, 1); } }] : []),
    ]} />;
  };
  const name = (row: Project, className: string) => (tab === 'deleted' ? row.name
    : <Link to="/workspaces/$workspaceId/projects/$projectId" params={{ workspaceId, projectId: row.id }} className={className}>{row.name}</Link>);
  const columns: SheetColumn<Project>[] = [
    { key: 'name', header: '프로젝트', render: row => <span className={styles.named}><ProjectMark project={row} />{name(row, SHEET_ROW_LINK)}</span> },
    { key: 'key', header: '키', width: '6rem', render: row => <span className={styles.key}>{row.key}</span> },
    { key: 'description', header: '설명', render: row => <span className={styles.clip}>{row.description}</span> },
    { key: 'updated', header: '최근 변경', width: '8rem', render: row => dateText(row.updatedAt) },
    ...(tab === 'deleted' && canManage ? [{ key: 'restore', header: '', width: '6rem', align: 'end' as const,
      render: (row: Project) => <Button label="복원" variant="secondary" size="sm" isLoading={restoring === row.id} isDisabled={!!restoring} onClick={() => { void restore(row); }} /> }] : []),
    ...(canOrder ? [{ key: 'order', header: '', width: '3rem', align: 'end' as const, render: orderMenu }] : []),
  ];
  const tabs: PageTab<ProjectStatus>[] = [{ value: 'active', label: '진행 중', icon: 'board' }, { value: 'archived', label: '보관됨', icon: 'lock' },
    ...(canManage ? [{ value: 'deleted' as const, label: '삭제됨', icon: 'delete' }] : [])];
  return <PageFrame title="모든 프로젝트" icon="board" chrome="header"
    tabs={<PageTabs value={tab} items={tabs} panelId={panelId} onChange={next => go({ status: next === 'active' ? undefined : next })} />}>
    <ListToolbar search={{ label: '프로젝트 검색', placeholder: '이름이나 키로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      action={canWrite ? { label: '프로젝트 만들기', icon: 'plus', onClick: () => setCreating(true), isCreate: true } : undefined} />
    <div role="tabpanel" id={panelId}>
      <FormMessage message={error} />
      {!result.data ? <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
        : rows.length === 0 ? <PageState kind={search.q ? 'search' : 'empty'} title={search.q ? `'${search.q}'에 맞는 프로젝트가 없습니다` : tab === 'archived' ? '보관한 프로젝트가 없습니다' : tab === 'deleted' ? '삭제한 프로젝트가 없습니다' : '아직 프로젝트가 없습니다'}
          description={search.q ? '다른 이름이나 키로 찾아보세요.' : '프로젝트를 만들면 업무를 그 안에 모을 수 있습니다.'} />
        : isMobile
          ? <ItemList label="프로젝트">{rows.map(row => <ItemRow key={row.id} lead={<ProjectMark project={row} size="md" />}
            title={name(row, ITEM_ROW_LINK)} meta={<><ItemMeta><span className={styles.key}>{row.key}</span></ItemMeta><ItemMeta>{dateText(row.updatedAt)}</ItemMeta></>}
            end={canOrder ? orderMenu(row) : undefined} />)}</ItemList>
          : <SheetTable label="프로젝트" columns={columns} rows={rows} rowKey={row => row.id} minWidth="44rem" />}
      <ListMore hasMore={!!result.hasNextPage} isLoading={result.isFetchingNextPage} onMore={() => { void result.fetchNextPage(); }} />
    </div>
    <CreateProjectDialog workspaceId={workspaceId} isOpen={isCreating} onClose={() => setCreating(false)}
      onCreated={id => { setCreating(false); void navigate({ to: '/workspaces/$workspaceId/projects/$projectId', params: { workspaceId, projectId: id } }); }} />
  </PageFrame>;
}
