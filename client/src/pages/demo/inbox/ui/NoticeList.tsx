import { Link } from '@tanstack/react-router';
import { DefaultAvatar } from '@/shared/ui';
import { agoText, personOf, type InboxSearch, type Notice } from '@/entities/demo-sample';
import styles from './inbox.module.css';

/**
 * A desktop's narrow list of notices beside the open one, as Kaneo's inbox: per notice the actor's picture, what
 * happened (bold while unread, with the accent dot), what it is about on a second line and how long ago. The open notice
 * lies on the muted surface; each is a link to its own address, carrying the list's conditions.
 */
export function NoticeList({ workspaceId, notices, read, openId, search }: { workspaceId: string; notices: Notice[]; read: Set<string>; openId?: string; search: InboxSearch }) {
  return <ul className={styles.list} aria-label="알림">{notices.map(notice => {
    const actor = personOf(notice.actorId);
    const isUnread = !read.has(notice.id);
    return <li key={notice.id}>
      <Link to="/demo/w/$workspaceId/inbox/$noticeId" params={{ workspaceId, noticeId: notice.id }} search={search} className={styles.entry}
        data-open={notice.id === openId || undefined} data-unread={isUnread || undefined} aria-current={notice.id === openId ? 'true' : undefined}>
        <DefaultAvatar seed={notice.actorId} name={actor?.name} size={32} />
        <span className={styles.entryText}>
          <span className={styles.entryTitle}>{isUnread && <span className={styles.dot} aria-label="읽지 않음" role="img" />}{notice.title}</span>
          <span className={styles.entryTarget}><span className={styles.key}>{notice.target.key}</span> {notice.target.title}</span>
        </span>
        <span className={styles.entryTime}>{agoText(notice.at)}</span>
      </Link>
    </li>;
  })}</ul>;
}
