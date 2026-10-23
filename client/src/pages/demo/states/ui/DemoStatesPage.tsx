import { useId } from 'react';
import { Button, Skeleton, VStack } from '@astryxdesign/core';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { PageFrame, PageState, PageTabs, type PageTab } from '@/shared/ui';
import { demoStyles, type StatesSearch } from '@/entities/demo-sample';

type State = NonNullable<StatesSearch['state']>;
const TABS: PageTab<State>[] = [
  { value: 'empty', label: '빈 목록' }, { value: 'search', label: '검색 결과 없음' }, { value: 'not-found', label: '찾을 수 없음' },
  { value: 'error', label: '오류' }, { value: 'loading', label: '로딩' },
];

/**
 * PATTERN · 상태. Every list and page has these; copy the wording rules, not this page.
 *
 * - Empty: nothing yet. Say what will appear here and offer the way to make the first one.
 * - Search: nothing matches. Name the condition and offer '조건 지우기'.
 * - Not found: the address names nothing (deleted, moved, no access). Offer the way back.
 * - Error: the read failed. Say it plainly and offer '다시 시도'; never show the raw error.
 * - Loading: keep the page's shape with skeleton rows rather than a spinner in the middle.
 * PageState fills the height the page leaves and sits a little above its middle; isCompact keeps it at the top under
 * other content.
 */
export function DemoStatesPage() {
  const search = useSearch({ from: '/demo/patterns/states' });
  const navigate = useNavigate();
  const panelId = useId();
  const state: State = search.state ?? 'empty';
  return <PageFrame title="상태" icon="status" chrome="header"
    tabs={<PageTabs value={state} items={TABS} panelId={panelId} onChange={next => void navigate({ to: '/demo/patterns/states', search: next === 'empty' ? {} : { state: next } })} />}>
    <div role="tabpanel" id={panelId} className={demoStyles.statePanel}>
      {state === 'empty' && <PageState title="아직 작업이 없습니다" description="첫 작업을 만들면 여기에 보입니다. 에이전트도 MCP로 작업을 만들 수 있습니다." actions={<Button label="새 작업 만들기" variant="secondary" />} />}
      {state === 'search' && <PageState kind="search" title="조건에 맞는 작업이 없습니다" description="'배포' 검색어와 '긴급' 우선순위 필터가 걸려 있습니다." actions={<Button label="조건 지우기" variant="secondary" />} />}
      {state === 'not-found' && <PageState kind="not-found" title="작업을 찾을 수 없습니다" description="지워졌거나, 주소가 바뀌었거나, 이 워크스페이스의 멤버가 아닙니다." actions={<Button label="이전으로 돌아가기" variant="primary" />} />}
      {state === 'error' && <PageState kind="error" title="목록을 불러오지 못했습니다" description="잠시 뒤 다시 시도해 주세요. 계속되면 서버 상태를 확인해 주세요." actions={<Button label="다시 시도" variant="secondary" />} />}
      {state === 'loading' && <VStack gap={0} aria-busy="true" aria-label="불러오는 중">
        {Array.from({ length: 8 }, (_, index) => <div key={index} className={demoStyles.skeletonRow}>
          <Skeleton width="3.5rem" height="0.75rem" /><Skeleton width={`${40 + ((index * 13) % 35)}%`} height="0.875rem" /><span className={demoStyles.skeletonEnd}><Skeleton width="4rem" height="0.75rem" /></span>
        </div>)}
      </VStack>}
    </div>
  </PageFrame>;
}
