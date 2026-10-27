import { Button, useToast } from '@astryxdesign/core';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { agoText } from '@/shared/lib/date-text';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListMore, NavIcon, PageFrame, PageState, QueryMessage } from '@/shared/ui';
import { noticesQuery, readAllNotices, readNotice, refreshNotices, unreadCountQuery, type Notice } from '@/entities/notification';
import styles from './inbox.module.css';

const ICONS: Record<Notice['type'], string> = {
  assigned: 'person', invited: 'people', commented: 'comment', rescheduled: 'calendar', due_today: 'clock', event_reminder: 'bell',
};

/**
 * 알림, /workspaces/$workspaceId/inbox (the bell at the menu's head, D-059, BIT-39): the member's notices in this workspace,
 * newest first. A notice says what happened (someone put them on a work item, commented on one, moved an event, a task
 * is due today, an event is about to start) over the work item it is about; an unread one lies on the accent surface.
 * Opening one reads it and goes to its work item; 모두 읽음 reads them all.
 */
export function InboxPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const client = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const notices = useInfiniteQuery(noticesQuery(workspaceId));
  const unread = useQuery(unreadCountQuery(workspaceId)).data?.unread ?? 0;
  const list = notices.data?.pages.flatMap(page => page.items) ?? [];
  const open = async (notice: Notice) => {
    try { if (!notice.readAt) await readNotice(workspaceId, notice.id); } catch (failure) { toast({ body: authError(failure) }); }
    void refreshNotices(client, workspaceId);
    if (notice.projectId) void navigate({ to: '/workspaces/$workspaceId/projects/$projectId/work-items/$workItemId', params: { workspaceId, projectId: notice.projectId, workItemId: notice.targetId } });
  };
  const readAll = async () => {
    try { await readAllNotices(workspaceId); } catch (failure) { toast({ body: authError(failure) }); }
    await refreshNotices(client, workspaceId);
  };
  return <PageFrame title="알림" icon="bell" chrome="header" width="narrow"
    actions={unread > 0 ? <Button label="모두 읽음" variant="secondary" onClick={() => { void readAll(); }} /> : undefined}>
    {!notices.data ? <QueryMessage pending={notices.isPending} error={notices.error} retry={() => { void notices.refetch(); }} />
      : list.length === 0 ? <PageState title="새 알림이 없습니다" description="나를 담당자나 참석자로 넣거나, 내 업무에 댓글이 달리거나, 일정이 다가오면 여기에 모입니다." />
      : <div className={styles.flush}>
        <ItemList label="알림">{list.map(notice => <ItemRow key={notice.id} tone={notice.readAt ? undefined : 'accent'}
          lead={<NavIcon name={ICONS[notice.type]} />}
          title={<button type="button" className={`${ITEM_ROW_LINK} ${styles.open}`} onClick={() => { void open(notice); }}>{notice.body}</button>}
          meta={<><ItemMeta width="16rem">{notice.title}</ItemMeta><ItemMeta width="5rem" align="end">{agoText(notice.createdAt)}</ItemMeta></>} />)}
        </ItemList>
        <ListMore hasMore={!!notices.hasNextPage} isLoading={notices.isFetchingNextPage} onMore={() => { void notices.fetchNextPage(); }} />
      </div>}
  </PageFrame>;
}
