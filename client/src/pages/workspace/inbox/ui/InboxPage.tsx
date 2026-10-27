import { useId, useState } from 'react';
import { Button, useToast } from '@astryxdesign/core';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { agoText } from '@/shared/lib/date-text';
import { ListMore, NavIcon, PageFrame, PageState, PageTabs, QueryMessage } from '@/shared/ui';
import { noticesQuery, readAllNotices, readNotice, refreshNotices, unreadCountQuery, NotificationAvatar, notificationKind, type Notice } from '@/entities/notification';
import type { InboxSearch } from '../model/search';
import { InboxDetail } from './InboxDetail';
import { InboxSplit } from './InboxSplit';
import styles from './inbox.module.css';

/** Inbox: an independently scrolling list and the selected notification with a link to its content (BIT-61). */
export function InboxPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const search = useSearch({ strict: false }) as InboxSearch;
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const panelId = useId();
  const [isReadingAll, setReadingAll] = useState(false);
  const notices = useInfiniteQuery(noticesQuery(workspaceId, search.filter === 'unread'));
  const unread = useQuery(unreadCountQuery(workspaceId)).data?.unread ?? 0;
  const list = notices.data?.pages.flatMap(page => page.items) ?? [];
  const go = (patch: Partial<InboxSearch>) => void navigate({ to: '/workspaces/$workspaceId/inbox', params: { workspaceId }, search: { ...search, ...patch } });
  const close = () => go({ notice: undefined });
  const open = async (notice: Notice) => {
    go({ notice: notice.id });
    try { if (!notice.readAt) await readNotice(workspaceId, notice.id); }
    catch (failure) { toast({ body: authError(failure) }); }
    await refreshNotices(client, workspaceId);
  };
  const readAll = async () => {
    if (isReadingAll) return;
    setReadingAll(true);
    try { await readAllNotices(workspaceId); }
    catch (failure) { toast({ body: authError(failure) }); }
    finally { await refreshNotices(client, workspaceId); setReadingAll(false); }
  };
  const emptyTitle = search.filter === 'unread' ? '읽지 않은 알림이 없습니다' : '새 알림이 없습니다';
  const emptyDescription = '나를 담당자나 참석자로 넣거나 내 업무에 댓글이 달리면 여기에 모입니다.';
  return <PageFrame title="알림" icon="bell" chrome="header"
    tabs={<PageTabs value={search.filter ?? 'all'} panelId={panelId} items={[{ value: 'all', label: '전체' }, { value: 'unread', label: `읽지 않음${unread ? ` ${unread}` : ''}` }]}
      onChange={value => go({ filter: value === 'unread' ? 'unread' : undefined })} />}
    actions={unread > 0 ? <Button label="모두 읽음" variant="secondary" size="sm" isLoading={isReadingAll} onClick={() => { void readAll(); }} /> : undefined}>
    <InboxSplit panelId={panelId} isSelected={!!search.notice}>
      <section className={styles.listPane} aria-label="알림 목록">
        {!notices.data ? <QueryMessage pending={notices.isPending} error={notices.error} retry={() => { void notices.refetch(); }} />
          : list.length === 0 ? <><p className={styles.quiet}>{emptyTitle}</p><div className={styles.mobileEmpty}><PageState title={emptyTitle} description={emptyDescription} /></div></>
            : <><ul className={styles.list}>{list.map(notice => <li key={notice.id}>
              <button type="button" className={styles.notice} aria-pressed={search.notice === notice.id} data-unread={!notice.readAt || undefined} onClick={() => { void open(notice); }}>
                <span className={styles.mark}><NotificationAvatar notice={notice} /><span className={styles.eventMark} title={notificationKind(notice.type).label}><NavIcon name={notificationKind(notice.type).icon} /></span></span>
                <span className={styles.copy}><strong>{notice.title}</strong><span className={styles.senderLine}>{notice.actor?.name ?? '알림'}{notice.actorAgent ? ` · ${notice.actorAgent}` : ''} · {notificationKind(notice.type).label}</span><span>{notice.body}</span><time dateTime={notice.createdAt}>{agoText(notice.createdAt)}</time></span>
              </button>
            </li>)}</ul><ListMore hasMore={!!notices.hasNextPage} isLoading={notices.isFetchingNextPage} onMore={() => { void notices.fetchNextPage(); }} /></>}
      </section>
      <section className={styles.detail} aria-label="알림 상세">
        {search.notice ? <InboxDetail workspaceId={workspaceId} noticeId={search.notice} onClose={close} />
          : <PageState title={list.length === 0 && notices.data ? emptyTitle : '알림을 선택해 주세요'}
            description={list.length === 0 && notices.data ? emptyDescription : '왼쪽 목록에서 알림을 고르면 알림 내용을 읽고 관련 콘텐츠로 이동할 수 있습니다.'} />}
      </section>
    </InboxSplit>
  </PageFrame>;
}
