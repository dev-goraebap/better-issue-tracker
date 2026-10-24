import { Link } from '@tanstack/react-router';
import { DefaultAvatar } from '@/shared/ui';
import { agoText, personOf, projectOf, type Activity } from '@/entities/demo-sample';
import styles from './home.module.css';

/**
 * The workspace's latest activity, newest first: who did what to which work, 결정기록 or note, in which project and how
 * long ago; the thing's key and title link to it (a work item's page, the project's 결정기록 or 노트 tab).
 */
export function ActivityFeed({ workspaceId, items }: { workspaceId: string; items: readonly Activity[] }) {
  return <ol className={styles.feed} aria-label="최근 활동">{items.map(item => {
    const actor = personOf(item.actorId);
    const link = item.target.kind === 'work'
      ? <Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.target.id }} className={styles.feedTarget}>
        <span className={styles.feedKey}>{item.key}</span>{item.title}</Link>
      : <Link to="/demo/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: item.projectId }} search={{ tab: item.target.kind === 'decision' ? 'decisions' : 'notes' }}
        className={styles.feedTarget}><span className={styles.feedKey}>{item.key}</span>{item.title}</Link>;
    return <li key={item.id} className={styles.feedRow}>
      <DefaultAvatar seed={item.actorId} name={actor?.name} size={24} />
      <div className={styles.feedBody}>
        <span className={styles.feedLine}><strong>{actor?.name}</strong>님이 {item.verb}</span>
        {link}
      </div>
      <span className={styles.feedMeta}><span className={styles.feedProject}>{projectOf(item.projectId)?.name}</span>{agoText(item.at)}</span>
    </li>;
  })}</ol>;
}
