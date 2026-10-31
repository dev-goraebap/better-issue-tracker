import { favoritesQuery, setFavorite } from '@/entities/navigation';
import { useCallback, useId, useMemo, useState } from 'react';
import { Button, IconButton } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { authError } from '@/shared/api';
import { rowReorderStyles as moving, useRowReorder } from '@/shared/lib/row-reorder';
import { dateText } from '@/shared/lib/date-text';
import {
  FormMessage, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListMore, ListToolbar, NavIcon, PageFrame, PageState, PageTabs, QueryMessage, SHEET_ROW_LINK, SheetTable, type PageTab, type SheetColumn,
} from '@/shared/ui';
import { ProjectMark, projectsQuery, refreshProjects, reorderProjects, restoreProject, type Project, type ProjectStatus } from '@/entities/project';
import { canManage as canManageIn, canWrite as canWriteIn, workspaceQuery } from '@/entities/workspace';
import { CreateProjectDialog } from './CreateProjectDialog';
import type { ProjectsSearch } from '../model/search';
import styles from './projects.module.css';


/**
 * PATTERN · 탭 목록 (모든 프로젝트), /workspaces/$workspaceId/projects (?status=archived|deleted). Projects as a table: the name
 * links the row to the project's work items, its key, description and when it changed; archived ones in their own tab, and
 * for the owner and admins the deleted ones, each restorable. A phone reads them as cards.
 * - Projects read in the workspace's order (D-080). On the whole unsearched active list, managers drag a grip or use Alt + arrows.
 */
export function ProjectsPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const favorites = useQuery(favoritesQuery(workspaceId)).data ?? [];
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
  const reorder = useRowReorder(rows, { word: '프로젝트', object: '프로젝트를', topic: '프로젝트는' }, `${moving.ghost} ${styles.projectGhost}`, async order => {
    setError('');
    try { await reorderProjects(workspaceId, order); }
    finally { await refreshProjects(client, workspaceId); }
  }, failure => setError(authError(failure)));
  const shown = reorder.order.map(id => rows.find(row => row.id === id)!);
  const grip = (row: Project) => <button type="button" className={moving.grip} {...reorder.gripProps(row)}><NavIcon name="grip" /></button>;
  const name = (row: Project, className: string) => (tab === 'deleted' ? row.name
    : <Link to="/workspaces/$workspaceId/projects/$projectId" params={{ workspaceId, projectId: row.id }} className={className}>{row.name}</Link>);
  const favorite = (row: Project) => <IconButton label={favorites.includes(row.id) ? `${row.name} 즐겨찾기 해제` : `${row.name} 즐겨찾기`} variant="ghost" size="sm" aria-pressed={favorites.includes(row.id)} className={favorites.includes(row.id) ? styles.favoriteOn : undefined} icon={<NavIcon name="s:star" />} onClick={() => void setFavorite(workspaceId, row.id, !favorites.includes(row.id)).then(() => client.invalidateQueries({ queryKey: favoritesQuery(workspaceId).queryKey })).catch(failure => setError(authError(failure)))} />;
  const columns: SheetColumn<Project>[] = [
    ...(canOrder ? [{ key: 'drag', header: '', width: '2.5rem', render: grip }] : []),
    ...(tab === 'active' ? [{ key: 'favorite', header: '', width: '3rem', render: favorite }] : []),
    { key: 'name', header: '프로젝트', render: row => <span className={styles.named}><ProjectMark project={row} />{name(row, SHEET_ROW_LINK)}</span> },
    { key: 'key', header: '키', width: '6rem', render: row => <span className={styles.key}>{row.key}</span> },
    { key: 'description', header: '설명', render: row => <span className={styles.clip}>{row.description}</span> },
    { key: 'updated', header: '최근 변경', width: '8rem', render: row => dateText(row.updatedAt) },
    ...(tab === 'deleted' && canManage ? [{ key: 'restore', header: '', width: '6rem', align: 'end' as const,
      render: (row: Project) => <Button label="복원" variant="secondary" size="sm" isLoading={restoring === row.id} isDisabled={!!restoring} onClick={() => { void restore(row); }} /> }] : []),
  ];
  const tabs: PageTab<ProjectStatus>[] = [{ value: 'active', label: '진행 중', icon: 'board' }, { value: 'archived', label: '보관됨', icon: 'lock' },
    ...(canManage ? [{ value: 'deleted' as const, label: '삭제됨', icon: 'delete' }] : [])];
  return <PageFrame title="모든 프로젝트" icon="board" chrome="header"
    tabs={<PageTabs value={tab} items={tabs} panelId={panelId} onChange={next => go({ status: next === 'active' ? undefined : next })} />}>
    <ListToolbar search={{ label: '프로젝트 검색', placeholder: '이름이나 키로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      action={canWrite ? { label: '프로젝트 만들기', icon: 'plus', onClick: () => setCreating(true), isCreate: true } : undefined} />
    <div role="tabpanel" id={panelId} ref={reorder.list} className={styles.ordered}>
      <FormMessage message={error} />
      {!result.data ? <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
        : rows.length === 0 ? <PageState kind={search.q ? 'search' : 'empty'} title={search.q ? `'${search.q}'에 맞는 프로젝트가 없습니다` : tab === 'archived' ? '보관한 프로젝트가 없습니다' : tab === 'deleted' ? '삭제한 프로젝트가 없습니다' : '아직 프로젝트가 없습니다'}
          description={search.q ? '다른 이름이나 키로 찾아보세요.' : '프로젝트를 만들면 업무를 그 안에 모을 수 있습니다.'} />
        : isMobile
          ? <ItemList label="프로젝트">{shown.map(row => <ItemRow key={row.id} rowProps={canOrder ? { ...reorder.rowProps(row.id), className: moving.row } : undefined} lead={<>{canOrder && grip(row)}<ProjectMark project={row} size="md" /></>}
            title={name(row, ITEM_ROW_LINK)} meta={<><ItemMeta><span className={styles.key}>{row.key}</span></ItemMeta><ItemMeta>{dateText(row.updatedAt)}</ItemMeta></>}
            end={tab === 'active' ? favorite(row) : undefined} />)}</ItemList>
          : <SheetTable label="프로젝트" columns={columns} rows={shown} rowKey={row => row.id} rowProps={canOrder ? row => ({ ...reorder.rowProps(row.id), 'data-carried': reorder.rowProps(row.id)['data-carried'] ? 'true' : undefined, className: moving.row }) : undefined} minWidth="44rem" />}
      {canOrder && <><span id={reorder.hint} className={styles.spoken}>손잡이를 끌거나 Alt와 위아래 화살표로 순서를 바꿉니다. 끄는 동안 Esc는 취소입니다.</span><span className={styles.spoken} role="status" aria-live="polite">{reorder.said}</span></>}
      <ListMore hasMore={!!result.hasNextPage} isLoading={result.isFetchingNextPage} onMore={() => { void result.fetchNextPage(); }} />
    </div>
    <CreateProjectDialog workspaceId={workspaceId} isOpen={isCreating} onClose={() => setCreating(false)}
      onCreated={id => { setCreating(false); void navigate({ to: '/workspaces/$workspaceId/projects/$projectId', params: { workspaceId, projectId: id } }); }} />
  </PageFrame>;
}
