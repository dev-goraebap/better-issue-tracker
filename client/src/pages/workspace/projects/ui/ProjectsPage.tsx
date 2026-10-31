import { favoritesQuery, setFavorite } from '@/entities/navigation';
import { useCallback, useId, useMemo, useState } from 'react';
import { IconButton } from '@astryxdesign/core';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { projectSettingsPath } from '@/shared/config';
import { authError } from '@/shared/api';
import { rowReorderStyles as moving, useRowReorder } from '@/shared/lib/row-reorder';
import { dateText } from '@/shared/lib/date-text';
import {
  ConfirmDialog, FormMessage, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListFill, ListMore, ListSummary, MoreMenu, ListToolbar, NavIcon, PageFrame, PageState, PageTabs, QueryMessage, type PageTab,
} from '@/shared/ui';
import { archiveProject, deleteProject, ProjectMark, projectsQuery, refreshProjects, reorderProjects, type Project } from '@/entities/project';
import { canManage as canManageIn, canWrite as canWriteIn, workspaceQuery } from '@/entities/workspace';
import { CreateProjectDialog } from './CreateProjectDialog';
import type { ProjectsSearch } from '../model/search';
import styles from './projects.module.css';


/** Projects use the common row list at every width; the full active list keeps drag and keyboard ordering. */
export function ProjectsPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const favorites = useQuery(favoritesQuery(workspaceId)).data ?? [];
  const search = useSearch({ strict: false }) as ProjectsSearch;
  const navigate = useNavigate();
  const client = useQueryClient();
  const panelId = useId();
  const role = useQuery(workspaceQuery(workspaceId)).data;
  const canManage = canManageIn(role);
  const canWrite = canWriteIn(role, 'EDIT_SETTINGS');
  const tab = search.status ?? 'active';
  const result = useInfiniteQuery(projectsQuery(workspaceId, tab, search.q ?? ''));
  const rows = useMemo(() => result.data?.pages.flatMap(page => page.items) ?? [], [result.data]);
  const [isCreating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState<{ project: Project; action: 'archive' | 'delete' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [askError, setAskError] = useState<Error | null>(null);
  const act = async () => {
    if (!asking || busy) return;
    setBusy(true); setAskError(null);
    try {
      const project = asking.project;
      if (asking.action === 'archive') await archiveProject(workspaceId, project.id, project.version, tab === 'active');
      else await deleteProject(workspaceId, project.id, project.version);
      setAsking(null);
      await refreshProjects(client, workspaceId);
    } catch (failure) { setAskError(new Error(authError(failure))); }
    finally { setBusy(false); }
  };
  const go = useCallback((patch: Partial<ProjectsSearch>, replace = false) => void navigate({
    to: '/workspaces/$workspaceId/projects', params: { workspaceId }, replace,
    search: Object.fromEntries(Object.entries({ ...search, ...patch }).filter(([, value]) => value !== undefined && value !== '')),
  }), [navigate, workspaceId, search]);
  // The order is the whole list's: it moves while every active project is in view and none is searched away.
  const canOrder = canManage && tab === 'active' && !search.q && !result.hasNextPage && rows.length > 1;
  const reorder = useRowReorder(rows, { word: '프로젝트', object: '프로젝트를', topic: '프로젝트는' }, `${moving.ghost} ${styles.projectGhost}`, async order => {
    setError('');
    try { await reorderProjects(workspaceId, order); }
    finally { await refreshProjects(client, workspaceId); }
  }, failure => setError(authError(failure)));
  const shown = reorder.order.map(id => rows.find(row => row.id === id)!);
  const grip = (row: Project) => <button type="button" className={moving.grip} {...reorder.gripProps(row)}><NavIcon name="grip" /></button>;
  const name = (row: Project) => <Link to="/workspaces/$workspaceId/projects/$projectId" params={{ workspaceId, projectId: row.id }} className={`${ITEM_ROW_LINK} ${styles.titleLink}`}><span className={styles.projectName}>{row.name}</span><span className={styles.key}>{row.key}</span></Link>;
  const favorite = (row: Project) => <IconButton label={favorites.includes(row.id) ? `${row.name} 즐겨찾기 해제` : `${row.name} 즐겨찾기`} variant="ghost" size="sm" aria-pressed={favorites.includes(row.id)} className={favorites.includes(row.id) ? styles.favoriteOn : undefined} icon={<NavIcon name="s:star" />} onClick={() => void setFavorite(workspaceId, row.id, !favorites.includes(row.id)).then(() => client.invalidateQueries({ queryKey: favoritesQuery(workspaceId).queryKey })).catch(failure => setError(authError(failure)))} />;
  const actions = (row: Project) => <span className={styles.actions}>
    {tab === 'active' && favorite(row)}
    <MoreMenu label={`${row.name} 더보기`} placement="end" alignment="end" isDisabled={busy} items={[
      { label: '설정 바로가기', icon: <NavIcon name="settings" />, onClick: () => { void navigate({ href: projectSettingsPath(workspaceId, row.id) }); } },
      ...(canManage ? [
        { label: tab === 'archived' ? '보관 해제' : '보관', icon: <NavIcon name="lock" />, onClick: () => { setAskError(null); setAsking({ project: row, action: 'archive' }); } },
        { label: '삭제', icon: <NavIcon name="delete" />, onClick: () => { setAskError(null); setAsking({ project: row, action: 'delete' }); } },
      ] : []),
    ]} />
  </span>;
  const tabs: PageTab<'active' | 'archived'>[] = [{ value: 'active', label: '진행 중', icon: 'projects' }, { value: 'archived', label: '보관됨', icon: 'lock' }];
  return <PageFrame title="모든 프로젝트" icon="projects" chrome="header"
    tabs={<PageTabs value={tab} items={tabs} panelId={panelId} onChange={next => go({ status: next === 'active' ? undefined : next })} />}>
    <ListToolbar search={{ label: '프로젝트 검색', placeholder: '이름이나 키로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      action={canWrite ? { label: '프로젝트 만들기', icon: 'plus', onClick: () => setCreating(true), isCreate: true } : undefined} />
    <div role="tabpanel" id={panelId} ref={reorder.list} className={styles.ordered}>
      <FormMessage message={error} />
      {!result.data ? <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
        : rows.length === 0 ? <PageState kind={search.q ? 'search' : 'empty'} title={search.q ? `'${search.q}'에 맞는 프로젝트가 없습니다` : tab === 'archived' ? '보관한 프로젝트가 없습니다' : '아직 프로젝트가 없습니다'}
          description={search.q ? '다른 이름이나 키로 찾아보세요.' : '프로젝트를 만들면 업무를 그 안에 모을 수 있습니다.'} />
        : <ItemList label="프로젝트">{shown.map(row => <ItemRow key={row.id} isTitleSingleLine rowProps={{ ...(canOrder ? reorder.rowProps(row.id) : {}), className: `${styles.projectRow} ${canOrder ? moving.row : ''}` }} lead={<>{canOrder && grip(row)}<ProjectMark project={row} size="md" /></>}
            title={name(row)} description={row.description} meta={<><ItemMeta>{dateText(row.updatedAt)}</ItemMeta></>}
            end={actions(row)} />)}</ItemList>}

      {canOrder && <><span id={reorder.hint} className={styles.spoken}>손잡이를 끌거나 Alt와 위아래 화살표로 순서를 바꿉니다. 끄는 동안 Esc는 취소입니다.</span><span className={styles.spoken} role="status" aria-live="polite">{reorder.said}</span></>}
      {rows.length > 0 && (!result.hasNextPage
        ? <ListSummary shown={rows.length} total={rows.length} step={50} hasMore={false} onMore={() => {}} />
        : <><p className={styles.loaded} role="status">{rows.length}개 불러옴</p><ListMore hasMore isLoading={result.isFetchingNextPage} onMore={() => { void result.fetchNextPage(); }} /></>)}
      {rows.length > 0 && <ListFill />}
    </div>
    {asking && <ConfirmDialog title={asking.action === 'delete' ? '프로젝트를 삭제할까요?' : tab === 'archived' ? '보관을 풀까요?' : '프로젝트를 보관할까요?'}
      description={asking.action === 'delete' ? '프로젝트와 그 안의 업무가 목록에서 사라집니다.' : tab === 'archived' ? '다시 업무를 만들고 고칠 수 있습니다.' : '보관한 프로젝트는 읽을 수만 있습니다. 보관됨 탭에서 되돌릴 수 있습니다.'}
      confirmLabel={asking.action === 'delete' ? '프로젝트 삭제' : tab === 'archived' ? '보관 해제' : '보관'} variant={asking.action === 'delete' ? 'destructive' : 'primary'}
      word={asking.action === 'delete' ? asking.project.key : undefined} isPending={busy} error={askError} onClose={() => { setAsking(null); setAskError(null); }} onConfirm={() => { void act(); }} />}
    <CreateProjectDialog workspaceId={workspaceId} isOpen={isCreating} onClose={() => setCreating(false)}
      onCreated={id => { setCreating(false); void navigate({ to: '/workspaces/$workspaceId/projects/$projectId', params: { workspaceId, projectId: id } }); }} />
  </PageFrame>;
}
