import { emptyTaskSearch } from '@/features/work-item-filters';
import { useState } from 'react';
import { Button, Selector, Text, VStack } from '@astryxdesign/core';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { projectsQuery, projectPath, refreshProjects } from '@/entities/project';
import { workspaceQuery } from '@/entities/workspace';
import { authError, command } from '@/shared/api';
import { PageFrame, FormMessage, QueryMessage } from '@/shared/ui';
import { ProjectSearchForm } from './ProjectSearchForm';
import { CreateProjectDialog } from './CreateProjectDialog';
import styles from './projects.module.css';
export function ProjectsPage() {
  const { workspaceId = '' } = useParams({ strict: false }); const search = useSearch({ from: '/workspace/w/$workspaceId/projects' }); const navigate = useNavigate(); const client = useQueryClient();
  const space = useQuery(workspaceQuery(workspaceId)); const canManage = space.data?.myRole === 'owner' || space.data?.myRole === 'admin';
  const result = useInfiniteQuery(projectsQuery(workspaceId, search.status, search.q)); const items = result.error ? [] : result.data?.pages.flatMap(page => page.items) ?? [];
  const [creating, setCreating] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const setStatus = (status: string) => { void navigate({ to: '/w/$workspaceId/projects', params: { workspaceId }, search: { q: search.q, status: status === 'archived' || status === 'deleted' ? status : 'active' } }); };
  return <PageFrame title="프로젝트" actions={canManage && <Button label="프로젝트 만들기" variant="primary" onClick={() => setCreating(true)} />} tools={<Selector label="프로젝트 상태" isLabelHidden value={search.status} onChange={setStatus} options={[{ value: 'active', label: '진행 중' }, { value: 'archived', label: '보관' }, ...(canManage ? [{ value: 'deleted', label: '삭제' }] : [])]} />}>
    <ProjectSearchForm key={search.q} query={search.q} onSearch={q => { void navigate({ to: '/w/$workspaceId/projects', params: { workspaceId }, search: { ...search, q } }); }} />
    <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} /><FormMessage message={error} />
    {!result.isPending && !result.error && !items.length && <Text color="secondary">{search.q ? '검색한 프로젝트가 없습니다.' : '아직 이 목록에 프로젝트가 없습니다.'}</Text>}
    <VStack gap={0} className={styles.list}>{items.map(project => <article key={project.id} className={styles.row}><VStack gap={1} className={styles.info}>
      {search.status !== 'deleted' ? <Link to="/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: project.id }} search={{ ...emptyTaskSearch(), view: 'board' }}>{project.name}</Link> : <Text weight="semibold">{project.name}</Text>}
      <Text type="supporting" color="secondary">{project.key}{project.description ? ` · ${project.description.slice(0, 120)}` : ''}</Text>
    </VStack>{search.status === 'deleted' && canManage ? <Button label="복원" isLoading={busy === project.id} isDisabled={!!busy} onClick={async () => { setBusy(project.id); setError(''); try { await command('POST', `${projectPath(workspaceId, project.id)}/restore`, { expectedVersion: project.version }); } catch (failure) { setError(authError(failure)); } setBusy(''); await refreshProjects(client, workspaceId); }} /> : <Link to="/w/$workspaceId/p/$projectId/settings" params={{ workspaceId, projectId: project.id }}>설정</Link>}</article>)}</VStack>
    {result.hasNextPage && <Button label="프로젝트 더 불러오기" onClick={() => { void result.fetchNextPage(); }} isLoading={result.isFetchingNextPage} />}
    <CreateProjectDialog workspaceId={workspaceId} open={creating} onClose={() => setCreating(false)} />
  </PageFrame>;
}
