import { useInfiniteQuery } from '@tanstack/react-query';
import { projectsQuery } from '@/entities/project';
import { isManuals } from '../model/manual';
import { useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { PageFrame } from '@/shared/ui';
import { useManualPreview } from '../model/use-manual-preview';
import { pagesInOrder, type Manual, type ManualSearch } from '../model/manual';
import { ManualList } from './ManualList';
import { ManualReader } from './ManualReader';
import { ManualBreadcrumb } from './ManualBreadcrumb';
import styles from './manuals.module.css';

export function ManualPreview({ workspaceId, projectId }: { workspaceId: string; projectId?: string }) {
  const store = useManualPreview(`${workspaceId}.${projectId ?? 'workspace'}`, !!projectId); const search = useSearch({ strict: false }) as ManualSearch;
  const navigate = useNavigate(); const manual = store.manuals.find(item => item.id === search.manual);
  const projectPages = useInfiniteQuery({ ...projectsQuery(workspaceId), enabled: !projectId });
  const projects = projectPages.data?.pages.flatMap(page => page.items) ?? [];
  useEffect(() => { if (!projectId && projectPages.hasNextPage && !projectPages.isFetchingNextPage && !projectPages.isFetchNextPageError) void projectPages.fetchNextPage(); }, [projectId, projectPages]);
  const linked = projectId ? [] : projects.flatMap(project => { try { const raw = localStorage.getItem(`bit.manual-preview.v1.${workspaceId}.${project.id}`); if (!raw) return []; const value: unknown = JSON.parse(raw); return isManuals(value) ? value.map(item => ({ ...item, id: `${project.id}.${item.id}`, title: `${item.title} · ${project.name}`, originalId: item.id, projectId: project.id })) : []; } catch { return []; } });
  const base = projectId ? `/workspaces/${workspaceId}/projects/${projectId}/manuals` : `/workspaces/${workspaceId}/manuals`;
  const firstPageId = manual ? pagesInOrder(manual)[0]?.id : undefined;
  useEffect(() => {
    if (search.manual && !search.page && firstPageId) void navigate({ href: `${base}?${new URLSearchParams(Object.fromEntries(Object.entries({ ...search, page: firstPageId }).filter(([, value]) => value !== undefined)) as Record<string, string>)}`, replace: true });
  }, [search.manual, search.page, firstPageId, navigate, workspaceId, projectId]);
  const change = (next: ManualSearch, replace = false) => void navigate({ href: `${base}${Object.keys(next).length ? `?${new URLSearchParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined)) as Record<string, string>)}` : ''}`, replace });
  const save = (item: Manual) => store.save(store.manuals.some(existing => existing.id === item.id) ? store.manuals.map(existing => existing.id === item.id ? item : existing) : [...store.manuals, item]);
  const page = manual?.pages.find(item => item.id === search.page);
  return <PageFrame title={manual?.title ?? '매뉴얼'} width="full" isDetail hideHeading fillsContent
    headerContent={<ManualBreadcrumb title={manual?.title} section={manual?.sections.find(item => item.id === page?.sectionId)?.title} onBack={() => change({})} />}>
    {store.error && <div className={styles.storeError} role="alert">{store.error}<button type="button" onClick={store.clearError}>다시 저장 허용</button></div>}
    {manual ? <ManualReader key={manual.id} manual={manual} pageId={search.page} query={search.q ?? ''} onQuery={q => change({ ...search, q: q || undefined }, true)} onPage={page => change({ ...search, page })} onBack={() => change({})} onSave={save} /> :
      search.manual ? <div className={styles.empty}><h1>매뉴얼을 찾을 수 없습니다</h1><button type="button" onClick={() => change({})}>목록으로 돌아가기</button></div> : <ManualList manuals={[...store.manuals, ...linked]} onSave={save} onOpen={id => { const source = linked.find(item => item.id === id); if (source) void navigate({ href: `/workspaces/${workspaceId}/projects/${source.projectId}/manuals?manual=${source.originalId}` }); else change({ manual: id }); }} />}
  </PageFrame>;
}
