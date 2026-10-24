import { useCallback, useId, useMemo, useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { authError, command } from '@/shared/api';
import {
  FormMessage, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListToolbar, PageFrame, PageState, PageTabs, QueryMessage, SHEET_ROW_LINK, SheetTable, type PageTab, type SheetColumn,
} from '@/shared/ui';
import { projectPath, projectsQuery, refreshProjects, type Project, type ProjectStatus } from '@/entities/project';
import { workspaceQuery } from '@/entities/workspace';
import { CreateProjectDialog } from '@/features/project-create';
import styles from './projects.module.css';

const dayText = (iso: string) => new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

/**
 * PATTERN · 탭 목록 (모든 프로젝트), /w/$workspaceId/projects (?status=archived|deleted). Projects as a table: the name
 * links the row to the project's issues, its key, description and when it changed; archived ones in their own tab, and
 * for the owner and admins the deleted ones, each restorable. A phone reads them as cards.
 */
export function ProjectsPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const search = useSearch({ strict: false }) as { status: ProjectStatus; q: string };
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const navigate = useNavigate();
  const client = useQueryClient();
  const panelId = useId();
  const role = useQuery(workspaceQuery(workspaceId)).data?.myRole;
  const canManage = role === 'owner' || role === 'admin';
  const canWrite = canManage || role === 'member';
  const tab = search.status;
  const result = useInfiniteQuery(projectsQuery(workspaceId, tab, search.q));
  const rows = useMemo(() => result.data?.pages.flatMap(page => page.items) ?? [], [result.data]);
  const [isCreating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState('');
  const [error, setError] = useState('');
  const go = useCallback((patch: Partial<{ status: ProjectStatus; q: string }>, replace = false) => void navigate({
    to: '/w/$workspaceId/projects', params: { workspaceId }, replace, search: { ...search, ...patch },
  }), [navigate, workspaceId, search]);
  const restore = async (project: Project) => {
    setRestoring(project.id); setError('');
    try { await command('POST', `${projectPath(workspaceId, project.id)}/restore`, { expectedVersion: project.version }); }
    catch (failure) { setError(authError(failure)); }
    finally { setRestoring(''); await refreshProjects(client, workspaceId); }
  };
  const name = (row: Project, className: string) => (tab === 'deleted' ? row.name
    : <Link to="/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: row.id }} className={className}>{row.name}</Link>);
  const columns: SheetColumn<Project>[] = [
    { key: 'name', header: '프로젝트', render: row => name(row, SHEET_ROW_LINK) },
    { key: 'key', header: '키', width: '6rem', render: row => <span className={styles.key}>{row.key}</span> },
    { key: 'description', header: '설명', render: row => <span className={styles.clip}>{row.description}</span> },
    { key: 'updated', header: '최근 변경', width: '8rem', render: row => dayText(row.updatedAt) },
    ...(tab === 'deleted' && canManage ? [{ key: 'restore', header: '', width: '6rem', align: 'end' as const,
      render: (row: Project) => <Button label="복원" variant="secondary" size="sm" isLoading={restoring === row.id} isDisabled={!!restoring} onClick={() => { void restore(row); }} /> }] : []),
  ];
  const tabs: PageTab<ProjectStatus>[] = [{ value: 'active', label: '진행 중', icon: 'board' }, { value: 'archived', label: '보관됨', icon: 'lock' },
    ...(canManage ? [{ value: 'deleted' as const, label: '삭제됨', icon: 'delete' }] : [])];
  return <PageFrame title="모든 프로젝트" icon="board" chrome="header"
    tabs={<PageTabs value={tab} items={tabs} panelId={panelId} onChange={next => go({ status: next })} />}>
    <ListToolbar search={{ label: '프로젝트 검색', placeholder: '이름이나 키로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      action={canWrite ? { label: '프로젝트 만들기', icon: 'plus', onClick: () => setCreating(true), isCreate: true } : undefined} />
    <div role="tabpanel" id={panelId}>
      <FormMessage message={error} />
      {!result.data ? <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
        : rows.length === 0 ? <PageState kind={search.q ? 'search' : 'empty'} title={search.q ? `'${search.q}'에 맞는 프로젝트가 없습니다` : tab === 'archived' ? '보관한 프로젝트가 없습니다' : tab === 'deleted' ? '삭제한 프로젝트가 없습니다' : '아직 프로젝트가 없습니다'}
          description={search.q ? '다른 이름이나 키로 찾아보세요.' : '프로젝트를 만들면 이슈를 그 안에 모을 수 있습니다.'} />
        : isMobile
          ? <ItemList label="프로젝트">{rows.map(row => <ItemRow key={row.id} lead={<span className={styles.mark}>{row.key.slice(0, 1)}</span>}
            title={name(row, ITEM_ROW_LINK)} meta={<><ItemMeta><span className={styles.key}>{row.key}</span></ItemMeta><ItemMeta>{dayText(row.updatedAt)}</ItemMeta></>} />)}</ItemList>
          : <SheetTable label="프로젝트" columns={columns} rows={rows} rowKey={row => row.id} minWidth="44rem" />}
      {result.hasNextPage && <Button label="더 불러오기" variant="secondary" onClick={() => { void result.fetchNextPage(); }} isLoading={result.isFetchingNextPage} />}
    </div>
    <CreateProjectDialog workspaceId={workspaceId} isOpen={isCreating} onClose={() => setCreating(false)}
      onCreated={id => { setCreating(false); void navigate({ to: '/w/$workspaceId/p/$projectId', params: { workspaceId, projectId: id } }); }} />
  </PageFrame>;
}
