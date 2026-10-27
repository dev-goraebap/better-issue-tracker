import { infiniteQueryOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import { command, readJson, type components } from '@/shared/api';
import { rememberPictures } from '@/shared/lib/person-pictures';

export type Notice = components['schemas']['Notification'];
const base = (w: string) => `/api/v1/workspaces/${encodeURIComponent(w)}/notifications`;
const rememberActors = (notices: readonly Notice[]) => rememberPictures(notices.flatMap(notice => notice.actor?.id ? [[notice.actor.id, notice.actor.avatar] as const] : []));
const root = (w: string) => ['workspace', w, 'notifications'] as const;
/** The member's notices in a workspace, newest first (BIT-39). */
export const noticesQuery = (w: string, unreadOnly = false) => infiniteQueryOptions({
  queryKey: [...root(w), 'list', unreadOnly], initialPageParam: undefined as string | undefined,
  queryFn: async ({ pageParam, signal }) => {
    const page = await readJson<components['schemas']['Notifications']>(`${base(w)}?size=30${unreadOnly ? '&unread=true' : ''}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`, signal);
    rememberActors(page.items); return page;
  },
  getNextPageParam: page => page.nextCursor ?? undefined, retry: false,
});
/** How many are unread, for the bell; read again every minute, as notices come from the server's own jobs too. */
export const unreadCountQuery = (w: string) => queryOptions({
  queryKey: [...root(w), 'unread'], queryFn: ({ signal }) => readJson<components['schemas']['NotificationCount']>(`${base(w)}/unread-count`, signal),
  refetchInterval: 60_000, retry: false,
});
export const readNotice = (w: string, id: string) => command('POST', `${base(w)}/${encodeURIComponent(id)}/read`);
export const readAllNotices = (w: string) => command('POST', `${base(w)}/read-all`);
export const refreshNotices = (client: QueryClient, w: string) => client.invalidateQueries({ queryKey: root(w) });

/** A recipient's own notice, independent of list paging and unread filters. */
export const noticeQuery = (w: string, id: string) => queryOptions({
  queryKey: [...root(w), 'notice', id], queryFn: async ({ signal }) => { const notice = await readJson<Notice>(`${base(w)}/${encodeURIComponent(id)}`, signal); rememberActors([notice]); return notice; }, retry: false,
});
