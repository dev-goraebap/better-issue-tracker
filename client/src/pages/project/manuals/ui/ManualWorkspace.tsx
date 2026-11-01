import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectQuery, projectsQuery } from '@/entities/project';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { PageFrame, PageState, PageLoader } from '@/shared/ui';
import { ApiError, authError, readJson } from '@/shared/api';
import { manualRoot, readManual, type ManualListing } from '../api/manuals';
import { saveManualAndRefresh } from '../api/save-manual';
import { pagesInOrder, type Manual, type ManualSearch } from '../model/manual';
import type { ManualListEntry } from '../model/manual-list';
import { ManualList } from './ManualList';
import { ManualReader } from './ManualReader';
import { ManualBreadcrumb } from './ManualBreadcrumb';
import styles from './manuals.module.css';

export function ManualWorkspace({ workspaceId, projectId }: { workspaceId: string; projectId?: string }) {
  const search = useSearch({ strict: false }) as ManualSearch;
  const navigate = useNavigate(); const cache = useQueryClient(); const pending = useRef(false);
  const [error, setError] = useState('');
  const root = ['workspace', workspaceId, 'manuals'];
  const listSearch = search.manual ? {} : { q: search.q, scope: projectId ? undefined : search.scope, color: search.color, sort: search.sort, dir: search.dir };
  const list = useInfiniteQuery({ queryKey: [...root, 'list', projectId ?? null, listSearch], initialPageParam: '',
    queryFn: ({ pageParam, signal }) => readJson<ManualListing>(`${manualRoot(workspaceId)}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(listSearch).filter(([, value]) => value !== undefined)) as Record<string,string>, ...(projectId ? { projectId } : {}), ...(pageParam ? { cursor: pageParam } : {}) })}`, signal),
    getNextPageParam: last => last.nextCursor || undefined, retry: false });

  const detail = useQuery({ queryKey: [...root, 'detail', search.manual], enabled: !!search.manual,
    queryFn: ({ signal }) => readManual(workspaceId, search.manual!, signal), retry: false, staleTime: 0, refetchOnWindowFocus: false });
  const manual = search.manual ? detail.data : undefined;
  const projectPages = useInfiniteQuery({ ...projectsQuery(workspaceId), enabled: !projectId });
  const project = useQuery({ ...projectQuery(workspaceId, projectId ?? ''), enabled: !!projectId }).data;
  const projects = projectPages.data?.pages.flatMap(page => page.items) ?? [];
  useEffect(() => { if (!projectId && projectPages.hasNextPage && !projectPages.isFetchingNextPage && !projectPages.isFetchNextPageError) void projectPages.fetchNextPage(); }, [projectId, projectPages]);
  const entries: ManualListEntry[] = list.data?.pages.flatMap(page => page.items).map(item => ({ key: item.id,
    manual: { ...item, cover: 'book', sections: [], pages: [], comments: [], assets: {} },
    projectId: item.projectId, scopeName: item.scopeName, isLocal: item.canEdit })) ?? [];
  const base = projectId ? `/workspaces/${workspaceId}/projects/${projectId}/manuals` : `/workspaces/${workspaceId}/manuals`;
  const firstPageId = manual ? pagesInOrder(manual)[0]?.id : undefined;
  useEffect(() => {
    if (manual && (manual.projectId || undefined) !== projectId) {
      const canonical = manual.projectId ? `/workspaces/${workspaceId}/projects/${manual.projectId}/manuals` : `/workspaces/${workspaceId}/manuals`;
      void navigate({ href: `${canonical}?${new URLSearchParams({ manual: manual.id, ...(search.page ? { page: search.page } : {}) })}`, replace: true });
    }
  }, [manual, projectId, workspaceId, navigate, search.page]);
  useEffect(() => {
    if (search.manual && !search.page && firstPageId && (manual?.projectId || undefined) === projectId) void navigate({ href: `${base}?${new URLSearchParams({ manual: search.manual, page: firstPageId })}`, replace: true });
  }, [search.manual, search.page, firstPageId, navigate, base, manual?.projectId, projectId]);
  const change = (next: ManualSearch, replace = false) => void navigate({ href: `${base}${Object.keys(next).length ? `?${new URLSearchParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined)) as Record<string, string>)}` : ''}`, replace });
  const save = async (item: Manual) => {
    if (pending.current) return false;
    pending.current = true; setError('');
    try {
      const outcome = await saveManualAndRefresh(workspaceId, projectId, item, async saved => {
        cache.setQueryData([...root, 'detail', saved.id], saved);
        await cache.invalidateQueries({ queryKey: [...root, 'list'] }, { throwOnError: true });
      });
      if (outcome === 'saved-with-refresh-error') setError('저장은 완료됐지만 최신 내용을 불러오지 못했습니다. 다시 저장하지 말고 최신 내용을 불러와 주세요.');
      return true;
    } catch (failure) {
      setError(failure instanceof ApiError && failure.status === 409 ? '다른 사용자가 매뉴얼을 수정했습니다. 초안은 유지됩니다. 본문을 복사한 뒤 취소하고 최신 내용을 확인해 주세요.' : failure instanceof ApiError ? authError(failure) : '저장하지 못했습니다. 입력은 유지됩니다.'); return false;
    } finally { pending.current = false; }
  };
  const refresh = async () => {
    try { await cache.invalidateQueries({ queryKey: root }, { throwOnError: true }); setError(''); }
    catch { setError('최신 내용을 불러오지 못했습니다. 다시 시도해 주세요.'); }
  };
  const page = manual?.pages.find(item => item.id === search.page);
  const failed = search.manual ? detail.error : list.error;
  const loading = search.manual ? detail.isPending : list.isPending;
  return <PageFrame title={manual?.title ?? '매뉴얼'} icon="manuals" chrome={manual ? undefined : 'header'} width={manual ? 'full' : undefined} isDetail={!!manual} hideHeading={!!manual} fillsContent={!!manual}
    headerContent={manual ? <ManualBreadcrumb title={manual.title} section={manual.sections.find(item => item.id === page?.sectionId)?.title} onBack={() => change({})} /> : undefined}>
    {error && <div className={styles.storeError} role="alert">{error}<button type="button" onClick={() => void refresh()}>최신 내용 불러오기</button><button type="button" onClick={() => setError('')}>닫기</button></div>}
    {failed ? <PageState kind="error" title="매뉴얼을 읽지 못했습니다" description={failed instanceof ApiError ? authError(failed) : '잠시 후 다시 시도해 주세요.'} /> : loading ? <PageLoader isVisible place="card" /> : manual ?
      <ManualReader key={manual.id} manual={manual} pageId={search.page} query={search.q ?? ''} onQuery={q => change({ ...search, q: q || undefined }, true)} onPage={page => change({ ...search, page })} onBack={() => change({})} onSave={save} /> :
      <ManualList entries={entries} search={search} total={list.data?.pages[0]?.total ?? entries.length} hasMore={list.hasNextPage} isLoadingMore={list.isFetchingNextPage} onMore={() => void list.fetchNextPage()} canCreate={list.data?.pages[0]?.canCreate ?? false} projectId={projectId} scopeName={project?.name ?? '워크스페이스 공통'} scopes={projects.map(project => ({ value: project.id, label: project.name }))} onSearch={(patch, replace) => change({ ...search, ...patch }, replace)} onSave={save} onOpen={key => {
        const entry = entries.find(item => item.key === key);
        if (entry?.projectId && entry.projectId !== projectId) void navigate({ href: `/workspaces/${workspaceId}/projects/${entry.projectId}/manuals?manual=${key}` }); else change({ manual: key });
      }} />}
  </PageFrame>;
}
