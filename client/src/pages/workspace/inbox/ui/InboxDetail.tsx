import { Button } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { NavIcon, QueryMessage } from '@/shared/ui';
import { noticeQuery, NotificationAvatar, notificationKind } from '@/entities/notification';
import styles from './inbox.module.css';

/** The notification itself, with an explicit way to open its related content. */
export function InboxDetail({ workspaceId, noticeId, onClose }: { workspaceId: string; noticeId: string; onClose: () => void }) {
  const result = useQuery(noticeQuery(workspaceId, noticeId));
  if (!result.data) return <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />;
  const notice = result.data;
  return <article className={styles.message}>
    <header className={styles.messageHead}><Button label="목록으로" variant="ghost" size="sm" icon={<NavIcon name="back" />} onClick={onClose} /></header>
    <div className={styles.messageBody}>
      <div className={styles.sender}>
        <NotificationAvatar notice={notice} size={40} />
        <span className={styles.senderText}><strong>{notice.actor?.name ?? '알림'}{notice.actorAgent && <span className={styles.agentTag}><NavIcon name="agent" />{notice.actorAgent}</span>}</strong>
          <span>{notificationKind(notice.type).label} · <time dateTime={notice.createdAt} title={new Date(notice.createdAt).toLocaleString('ko-KR')}>{new Date(notice.createdAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></span>
        </span>
      </div>
      <h2>{notice.title}</h2>
      <p className={styles.messageText}>{notice.body}</p>
      {notice.projectId && notice.targetType === 'work_item' && <Link className={styles.contentLink}
        to="/workspaces/$workspaceId/projects/$projectId/work-items/$workItemId"
        params={{ workspaceId, projectId: notice.projectId, workItemId: notice.targetId }}>
        해당 업무로 이동<NavIcon name="external" />
      </Link>}
    </div>
  </article>;
}
