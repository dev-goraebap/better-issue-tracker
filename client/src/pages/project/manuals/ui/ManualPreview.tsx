import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { projectQuery, projectsQuery } from '@/entities/project';
import { isManuals } from '../model/manual';
import { useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { PageFrame } from '@/shared/ui';
import { useManualPreview } from '../model/use-manual-preview';
import { now, pagesInOrder, type Manual, type ManualSearch } from '../model/manual';
import type { ManualListEntry } from '../model/manual-list';
import { ManualList } from './ManualList';
import { ManualReader } from './ManualReader';
import { ManualBreadcrumb } from './ManualBreadcrumb';
import styles from './manuals.module.css';

export function ManualPreview({ workspaceId, projectId }: { workspaceId: string; projectId?: string }) {
  const store = useManualPreview(`${workspaceId}.${projectId ?? 'workspace'}`, !!projectId); const search = useSearch({ strict: false }) as ManualSearch;
  const navigate = useNavigate(); const manual = store.manuals.find(item => item.id === search.manual);
  const projectPages = useInfiniteQuery({ ...projectsQuery(workspaceId), enabled: !projectId });
  const project = useQuery({ ...projectQuery(workspaceId, projectId ?? ''), enabled: !!projectId }).data;
  const projects = projectPages.data?.pages.flatMap(page => page.items) ?? [];
  useEffect(() => { if (!projectId && projectPages.hasNextPage && !projectPages.isFetchingNextPage && !projectPages.isFetchNextPageError) void projectPages.fetchNextPage(); }, [projectId, projectPages]);
  const linked = projectId ? [] : projects.flatMap(project => { try { const raw = localStorage.getItem(`bit.manual-preview.v1.${workspaceId}.${project.id}`); if (!raw) return []; const value: unknown = JSON.parse(raw); return isManuals(value) ? value.map(item => ({ key: `${project.id}.${item.id}`, manual: item, projectId: project.id, scopeName: project.name, isLocal: false })) : []; } catch { return []; } });
  const entries: ManualListEntry[] = [...store.manuals.map(manual => ({ key: manual.id, manual, projectId, scopeName: project?.name ?? '워크스페이스', isLocal: true })), ...linked];
  const base = projectId ? `/workspaces/${workspaceId}/projects/${projectId}/manuals` : `/workspaces/${workspaceId}/manuals`;
  const firstPageId = manual ? pagesInOrder(manual)[0]?.id : undefined;
  useEffect(() => {
    if (search.manual && !search.page && firstPageId) void navigate({ href: `${base}?${new URLSearchParams(Object.fromEntries(Object.entries({ ...search, page: firstPageId }).filter(([, value]) => value !== undefined)) as Record<string, string>)}`, replace: true });
  }, [search.manual, search.page, firstPageId, navigate, workspaceId, projectId]);
  const change = (next: ManualSearch, replace = false) => void navigate({ href: `${base}${Object.keys(next).length ? `?${new URLSearchParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined)) as Record<string, string>)}` : ''}`, replace });
  const save = (item: Manual) => { const saved = { ...item, createdAt: item.createdAt ?? (store.manuals.some(existing => existing.id === item.id) ? undefined : now()), updatedAt: now() }; return store.save(store.manuals.some(existing => existing.id === item.id) ? store.manuals.map(existing => existing.id === item.id ? saved : existing) : [...store.manuals, saved]); };
  const page = manual?.pages.find(item => item.id === search.page);
  return <PageFrame title={manual?.title ?? '매뉴얼'} icon="manuals" chrome={manual ? undefined : 'header'} width={manual ? 'full' : undefined} isDetail={!!manual} hideHeading={!!manual} fillsContent={!!manual}
    headerContent={manual ? <ManualBreadcrumb title={manual?.title} section={manual?.sections.find(item => item.id === page?.sectionId)?.title} onBack={() => change({})} /> : undefined}>
    {store.error && <div className={styles.storeError} role="alert">{store.error}<button type="button" onClick={store.clearError}>다시 저장 허용</button></div>}
    {manual ? <ManualReader key={manual.id} manual={manual} pageId={search.page} query={search.q ?? ''} onQuery={q => change({ ...search, q: q || undefined }, true)} onPage={page => change({ ...search, page })} onBack={() => change({})} onSave={save} /> :
      search.manual ? <div className={styles.empty}><h1>매뉴얼을 찾을 수 없습니다</h1><button type="button" onClick={() => change({})}>목록으로 돌아가기</button></div> : <ManualList entries={entries} search={search} projectId={projectId} scopeName={project?.name ?? '워크스페이스 공통'} scopes={projects.map(project => ({ value: project.id, label: project.name }))} onSearch={(patch, replace) => change({ ...search, ...patch }, replace)} onSave={save} onOpen={key => { const entry = entries.find(item => item.key === key); if (entry && !entry.isLocal) void navigate({ href: `/workspaces/${workspaceId}/projects/${entry.projectId}/manuals?manual=${entry.manual.id}` }); else change({ manual: key }); }} />}
  </PageFrame>;
}
