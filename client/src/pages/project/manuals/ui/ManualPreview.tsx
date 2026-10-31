import { useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { PageFrame } from '@/shared/ui';
import { useManualPreview } from '../model/use-manual-preview';
import { pagesInOrder, type Manual, type ManualSearch } from '../model/manual';
import { ManualList } from './ManualList';
import { ManualReader } from './ManualReader';
import { ManualBreadcrumb } from './ManualBreadcrumb';
import styles from './manuals.module.css';

export function ManualPreview({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const store = useManualPreview(`${workspaceId}.${projectId}`); const search = useSearch({ strict: false }) as ManualSearch;
  const navigate = useNavigate(); const manual = store.manuals.find(item => item.id === search.manual);
  const firstPageId = manual ? pagesInOrder(manual)[0]?.id : undefined;
  useEffect(() => {
    if (search.manual && !search.page && firstPageId) void navigate({ to: '/workspaces/$workspaceId/projects/$projectId/manuals', params: { workspaceId, projectId }, search: { ...search, page: firstPageId }, replace: true });
  }, [search.manual, search.page, firstPageId, navigate, workspaceId, projectId]);
  const change = (next: ManualSearch, replace = false) => void navigate({ to: '/workspaces/$workspaceId/projects/$projectId/manuals', params: { workspaceId, projectId }, search: next, replace });
  const save = (item: Manual) => store.save(store.manuals.some(existing => existing.id === item.id) ? store.manuals.map(existing => existing.id === item.id ? item : existing) : [...store.manuals, item]);
  const page = manual?.pages.find(item => item.id === search.page);
  return <PageFrame title={manual?.title ?? '매뉴얼'} width="full" isDetail hideHeading fillsContent
    headerContent={<ManualBreadcrumb title={manual?.title} section={manual?.sections.find(item => item.id === page?.sectionId)?.title} onBack={() => change({})} />}>
    {store.error && <div className={styles.storeError} role="alert">{store.error}<button type="button" onClick={store.clearError}>다시 저장 허용</button></div>}
    {manual ? <ManualReader key={manual.id} manual={manual} pageId={search.page} query={search.q ?? ''} onQuery={q => change({ ...search, q: q || undefined }, true)} onPage={page => change({ ...search, page })} onBack={() => change({})} onSave={save} /> :
      search.manual ? <div className={styles.empty}><h1>매뉴얼을 찾을 수 없습니다</h1><button type="button" onClick={() => change({})}>목록으로 돌아가기</button></div> : <ManualList manuals={store.manuals} onSave={save} onOpen={id => change({ manual: id })} />}
  </PageFrame>;
}
