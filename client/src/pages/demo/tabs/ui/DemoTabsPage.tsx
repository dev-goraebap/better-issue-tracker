import { useCallback, useId, useMemo } from 'react';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { ItemList, ItemMeta, ItemRow, ListToolbar, PageFrame, PageState, PageTabs, SheetTable, StatusToken, type PageTab, type SheetColumn } from '@/shared/ui';
import { dateText, type Decision, DECISIONS, demoStyles, PersonCell, type TabsSearch } from '@/entities/demo-sample';
import { Progress } from './Progress';

type Tab = 'all' | 'mine' | 'review';
const TABS: PageTab<Tab>[] = [{ value: 'all', label: '전체', icon: 'decision' }, { value: 'mine', label: '내 결정', icon: 'person' }, { value: 'review', label: '검토 요청', icon: 'status' }];
const STATUS = { proposed: { label: '제안', color: 'orange' }, accepted: { label: '확정', color: 'green' }, superseded: { label: '대체됨', color: 'gray' } } as const;

/**
 * PATTERN · 탭 목록. Copy this page for one kind of item seen through a few fixed views.
 *
 * - PageFrame tabs={<PageTabs>} with chrome="header": the tabs get their own row under the header row and the toolbar's
 *   tools move to that row's end. A desktop draws the tabs as a switch (icon + label), a phone as underlined labels
 *   sharing the row's width.
 * - The tab is a URL value (tab), left out for the first one; changing it keeps the search words.
 * - A computed figure (이행 진행) is drawn, not stored: a thin bar and "2/3", "해당 없음" when nothing derives from it.
 */
export function DemoTabsPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const search = useSearch({ from: '/demo/tabs' });
  const navigate = useNavigate();
  const panelId = useId();
  const tab: Tab = search.tab ?? 'all';
  const go = useCallback((patch: Partial<TabsSearch>, replace = false) => void navigate({ to: '/demo/tabs', replace, search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)) }), [navigate]);
  const rows = useMemo(() => DECISIONS
    .filter(decision => tab === 'all' || (tab === 'mine' ? decision.ownerId === 'u1' : decision.status === 'proposed'))
    .filter(decision => !search.q || decision.title.includes(search.q) || decision.key.includes(search.q.toUpperCase())), [tab, search.q]);
  const columns = useMemo<SheetColumn<Decision>[]>(() => [
    { key: 'title', header: '결정', render: row => <><span className={demoStyles.key}>{row.key}</span><span className={demoStyles.clip}>{row.title}</span></> },
    { key: 'status', header: '상태', width: '6.5rem', render: row => <StatusToken label={STATUS[row.status].label} color={STATUS[row.status].color} /> },
    { key: 'owner', header: '제안자', width: '8.5rem', render: row => <PersonCell id={row.ownerId} /> },
    { key: 'progress', header: '이행 진행', width: '10rem', render: row => <Progress value={row.progress} /> },
    { key: 'decided', header: '확정일', width: '7.5rem', align: 'end', render: row => (row.decidedAt ? dateText(row.decidedAt) : <span className={demoStyles.none}>-</span>) },
  ], []);
  return <PageFrame title="결정" icon="decision" chrome="header"
    tabs={<PageTabs value={tab} items={TABS} panelId={panelId} onChange={next => go({ tab: next === 'all' ? undefined : next as TabsSearch['tab'] })} />}>
    <ListToolbar search={{ label: '결정 검색', placeholder: '제목이나 D-번호로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      action={{ label: '새 결정', icon: 'plus', onClick: () => undefined, isCreate: true }} />
    <div role="tabpanel" id={panelId}>
      {rows.length > 0 && (isMobile
        ? <ItemList label="결정 목록">{rows.map(row => <ItemRow key={row.id} lead={<span className={demoStyles.key}>{row.key}</span>} title={row.title}
          meta={<ItemMeta><StatusToken label={STATUS[row.status].label} color={STATUS[row.status].color} /></ItemMeta>} />)}</ItemList>
        : <SheetTable label="결정 목록" columns={columns} rows={rows} rowKey={row => row.id} minWidth="52rem" />)}
      {rows.length === 0 && <PageState kind={search.q ? 'search' : 'empty'} title={search.q ? `'${search.q}'에 맞는 결정이 없습니다` : '이 탭에 보일 결정이 없습니다'}
        description={search.q ? '다른 낱말로 찾아보세요.' : '결정이 제안되거나 배정되면 여기에 보입니다.'} />}
    </div>
  </PageFrame>;
}
