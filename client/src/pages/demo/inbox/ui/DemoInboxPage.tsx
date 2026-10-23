import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { BackLink, DefaultAvatar, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListToolbar, PageFrame, PageState, type ListFilter, type ListFilterValues } from '@/shared/ui';
import { agoText, type InboxSearch, markAllRead, markRead, NOTICES, personOf, useReadNotices } from '@/entities/demo-sample';
import { NoticeDetail } from './NoticeDetail';
import { NoticeList } from './NoticeList';
import styles from './inbox.module.css';

const KIND_LABELS = { mention: '언급', assigned: '배정', decision: '결정', review: '검토 요청' } as const;

/**
 * PATTERN · 목록과 내용 (알림), /demo/w/$workspaceId/inbox and /inbox/$noticeId, opened from the bell at the menu's head
 * rather than a menu entry (D-059). Copy this page for a stream of short
 * items each opened on the spot.
 *
 * - A desktop splits the card as Kaneo does: a narrow list at the left (NoticeList, its own scroll) and the open item at
 *   the right (NoticeDetail), the split filling the card under the header row. Nothing open shows a quiet hint.
 * - A phone shows the list as cards (ItemRow); a notice opens as a full-screen page with its own way back (PageFrame back).
 * - Both use the same addresses: /inbox lists, /inbox/$noticeId opens one; the filters stay in the URL across both.
 * - Opening a notice marks it read. 모두 읽음 is the page's action but not a create, so it is never the floating +.
 */
export function DemoInboxPage() {
  const { workspaceId, noticeId } = useParams({ strict: false }) as { workspaceId: string; noticeId?: string };
  const search = useSearch({ strict: false }) as InboxSearch;
  const navigate = useNavigate();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const read = useReadNotices();
  useEffect(() => { if (noticeId) markRead(noticeId); }, [noticeId]);
  const go = useCallback((patch: Partial<InboxSearch>) => void navigate({
    to: '/demo/w/$workspaceId/inbox', params: { workspaceId },
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId]);
  const notices = useMemo(() => NOTICES
    .filter(notice => !search.read || (search.read === 'read') === read.has(notice.id))
    .filter(notice => !search.kind || notice.kind === search.kind), [search, read]);
  const open = NOTICES.find(notice => notice.id === noticeId);
  const unread = NOTICES.filter(notice => !read.has(notice.id)).length;
  const filters: ListFilter[] = [
    { key: 'read', label: '읽음', icon: 'bell', value: search.read, options: [{ value: 'unread', label: '안 읽음' }, { value: 'read', label: '읽음' }] },
    { key: 'kind', label: '종류', icon: 'list-filter', value: search.kind, options: Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label })) },
  ];
  const empty = search.read || search.kind
    ? <PageState kind="search" title="조건에 맞는 알림이 없습니다" description="다른 조건으로 찾아보세요." actions={<Button label="조건 지우기" variant="secondary" onClick={() => go({ read: undefined, kind: undefined })} />} />
    : <PageState title="새 알림이 없습니다" description="언급되거나 작업이 배정되면 여기에 모입니다." />;

  // A phone opens one notice as a page of its own, with its own way back to the list.
  if (isMobile && noticeId) return <PageFrame title={open?.title ?? '알림'} wrapsTitle back={<BackLink to="/demo/w/$workspaceId/inbox" params={{ workspaceId }} search={search} label="알림" />}>
    {open ? <NoticeDetail workspaceId={workspaceId} notice={open} isTitleShown={false} /> : <PageState kind="not-found" title="알림을 찾을 수 없습니다" description="지워졌거나 오래되어 정리되었습니다." />}
  </PageFrame>;

  return <PageFrame title="알림" icon="bell" chrome="header">
    <ListToolbar label="알림 조건" filters={filters} onFiltersChange={(values: ListFilterValues) => go(values as Partial<InboxSearch>)}
      action={unread > 0 ? { label: '모두 읽음', icon: 'done', onClick: markAllRead } : undefined} />
    {isMobile
      ? (notices.length > 0 ? <ItemList label="알림">{notices.map(notice => {
        const actor = personOf(notice.actorId);
        return <ItemRow key={notice.id} tone={read.has(notice.id) ? undefined : 'accent'} lead={<DefaultAvatar seed={notice.actorId} name={actor?.name} size={32} />}
          title={<Link to="/demo/w/$workspaceId/inbox/$noticeId" params={{ workspaceId, noticeId: notice.id }} search={search} className={ITEM_ROW_LINK}>{notice.title}</Link>}
          meta={<><ItemMeta><span className={styles.rowTarget}>{notice.target.key} {notice.target.title}</span></ItemMeta><ItemMeta>{agoText(notice.at)}</ItemMeta></>} />;
      })}</ItemList> : empty)
      : <div className={styles.split}>
        <div className={styles.listPane}>{notices.length > 0 ? <NoticeList workspaceId={workspaceId} notices={notices} read={read} openId={noticeId} search={search} /> : empty}</div>
        <div className={styles.detailPane}>
          {open ? <NoticeDetail workspaceId={workspaceId} notice={open} />
            : noticeId ? <PageState kind="not-found" isCompact title="알림을 찾을 수 없습니다" description="지워졌거나 오래되어 정리되었습니다." />
            : <PageState isCompact title="알림을 고르세요" description="왼쪽 목록에서 알림을 고르면 내용과 관련 항목이 여기에 보입니다." />}
        </div>
      </div>}
  </PageFrame>;
}
