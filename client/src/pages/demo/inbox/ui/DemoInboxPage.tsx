import { useCallback, useMemo, useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { DefaultAvatar, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListToolbar, NavIcon, PageFrame, PageState, type ListFilter, type ListFilterValues } from '@/shared/ui';
import { agoText, demoStyles, type InboxSearch, NOTICES, personOf } from '@/entities/demo-sample';

const KIND_LABELS = { mention: '언급', assigned: '배정', decision: '결정', review: '검토 요청' } as const;

/**
 * PATTERN · 행 목록 (Inbox). Copy this page for a list read by its titles, where some rows are new to the member.
 *
 * - ItemList/ItemRow: no header, one 44px line per row, the actor's avatar as lead, small meta at the end (the time
 *   with its clock icon, lined up by a fixed width).
 * - An unread row lies on the accent surface (tone="accent") with its title bold; reading it clears the tone.
 * - The page's main action is not a create (모두 읽음): ListToolbar action without isCreate is a secondary button on a
 *   desktop and an accent icon button on a phone, never the floating +.
 * - Filters with two or three choices pick one (read); the URL keeps them.
 */
export function DemoInboxPage() {
  const search = useSearch({ from: '/demo/inbox' });
  const navigate = useNavigate();
  const [read, setRead] = useState<Set<string>>(() => new Set(NOTICES.filter(notice => notice.isRead).map(notice => notice.id)));
  const go = useCallback((patch: Partial<InboxSearch>) => void navigate({ to: '/demo/inbox', search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)) }), [navigate]);
  const rows = useMemo(() => NOTICES
    .filter(notice => !search.read || (search.read === 'read') === read.has(notice.id))
    .filter(notice => !search.kind || notice.kind === search.kind), [search, read]);
  const unread = NOTICES.filter(notice => !read.has(notice.id)).length;
  const filters: ListFilter[] = [
    { key: 'read', label: '읽음', icon: 'bell', value: search.read, options: [{ value: 'unread', label: '안 읽음' }, { value: 'read', label: '읽음' }] },
    { key: 'kind', label: '종류', icon: 'list-filter', value: search.kind, options: Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label })) },
  ];
  return <PageFrame title="Inbox" icon="inbox" chrome="header">
    <ListToolbar label="알림 조건" filters={filters} onFiltersChange={(values: ListFilterValues) => go(values as Partial<InboxSearch>)}
      action={unread > 0 ? { label: '모두 읽음', icon: 'done', onClick: () => setRead(new Set(NOTICES.map(notice => notice.id))) } : undefined} />
    {rows.length > 0 && <ItemList label="알림">{rows.map(notice => {
      const actor = personOf(notice.actorId);
      const isUnread = !read.has(notice.id);
      return <ItemRow key={notice.id} tone={isUnread ? 'accent' : undefined}
        lead={<DefaultAvatar seed={notice.actorId} name={actor?.name} size={20} />}
        title={<button type="button" className={`${ITEM_ROW_LINK} ${demoStyles.rowButton} ${isUnread ? demoStyles.unread : ''}`} onClick={() => setRead(new Set([...read, notice.id]))}>
          {notice.title}<span className={demoStyles.rowTarget}>{notice.target}</span>
        </button>}
        meta={<><ItemMeta width="5rem">{KIND_LABELS[notice.kind]}</ItemMeta>
          <ItemMeta width="5.5rem" align="end" label={agoText(notice.at)}><span className={demoStyles.figure}><NavIcon name="clock" />{agoText(notice.at)}</span></ItemMeta></>} />;
    })}</ItemList>}
    {rows.length === 0 && (search.read || search.kind
      ? <PageState kind="search" title="조건에 맞는 알림이 없습니다" description="다른 조건으로 찾아보세요." actions={<Button label="조건 지우기" variant="secondary" onClick={() => go({ read: undefined, kind: undefined })} />} />
      : <PageState title="새 알림이 없습니다" description="언급되거나 작업이 배정되면 여기에 모입니다." />)}
  </PageFrame>;
}
