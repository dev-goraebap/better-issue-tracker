import { useDeferredValue, useId, useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage, NavIcon } from '@/shared/ui';
import { projectsQuery } from '@/entities/project';
import { searchTargets, type Candidate, type RelationType } from '@/entities/relation';
import styles from './relations.module.css';

/** Search is a draft; only the confirm button commits a selected relation. Escape leaves it unchanged. */
export function RelationPicker({ workspaceId, type, title, excluded = [], onSelect, onClose, confirmLabel = '연결' }: {
  workspaceId: string; type: RelationType; title: string; excluded?: readonly string[]; confirmLabel?: string;
  onSelect: (target: Candidate) => Promise<void>; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const group = useId();
  const projects = useInfiniteQuery(projectsQuery(workspaceId)).data?.pages.flatMap(page => page.items) ?? [];
  const result = useInfiniteQuery({ queryKey: ['workspace', workspaceId, 'relation-search', type, search],
    initialPageParam: undefined as string | undefined, retry: false,
    queryFn: ({ pageParam, signal }) => searchTargets(workspaceId, type, search, pageParam, signal), getNextPageParam: page => page.nextCursor ?? undefined });
  const items = result.data?.pages.flatMap(page => page.items).filter(item => !excluded.includes(item.id)) ?? [];
  const save = async () => {
    if (!selected || isBusy) return;
    setBusy(true); setError('');
    try { await onSelect(selected); onClose(); }
    catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <CompactDialog title={title} isBusy={isBusy} onClose={onClose} onSubmit={() => { void save(); }}
    footerStart={<span className={styles.hint}>{selected ? '1개 선택됨' : '대상을 선택하세요'}</span>}
    footer={<><Button label="취소" variant="ghost" onClick={onClose} isDisabled={isBusy} /><Button type="submit" label={confirmLabel} isDisabled={!selected} isLoading={isBusy} /></>}>
    <TextInput label={type === 'document' ? '문서 검색' : '업무 검색'} placeholder={type === 'document' ? '문서 제목으로 찾기' : '업무 제목이나 키로 찾기'} value={query} hasAutoFocus
      onChange={value => { setQuery(value); setSelected(null); }} isDisabled={isBusy} />
    <div className={styles.results} role="group" aria-label="검색 결과" aria-busy={result.isFetching}>
      {result.isPending ? <p className={styles.hint} role="status">검색하고 있습니다…</p> : result.error ? <FormMessage message={authError(result.error)} />
        : items.length ? items.map(item => <label key={item.id} className={styles.option} data-selected={selected?.id === item.id || undefined}>
          <input type="radio" name={group} checked={selected?.id === item.id} disabled={isBusy} onChange={() => setSelected(item)} />
          <NavIcon name={type === 'document' ? 'document' : 'task'} /><span className={styles.optionText}><span>{item.title}</span>
            <small>{[item.reference, item.projectId ? projects.find(project => project.id === item.projectId)?.name ?? '프로젝트 문서' : '워크스페이스 문서'].filter(Boolean).join(' · ')}</small></span>{selected?.id === item.id && <span className={styles.optionCheck}><NavIcon name="check" /></span>}
        </label>) : <p className={styles.hint}>연결할 수 있는 {type === 'document' ? '문서가' : '업무가'} 없습니다. 다른 검색어로 찾아보세요.</p>}
      {result.hasNextPage && <Button label="더 보기" variant="ghost" size="sm" isLoading={result.isFetchingNextPage} onClick={() => { void result.fetchNextPage(); }} />}
    </div>
    <FormMessage message={error} />
  </CompactDialog>;
}
