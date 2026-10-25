import { agoText } from '@/shared/lib/date-text';
import { DefaultAvatar } from '@/shared/ui';
import type { TimelineEntry } from '../api/timeline';
import { activityText, actorText, type ActivityNames } from '../model/activity-text';
import styles from './activity.module.css';

/**
 * One thing that happened to the issue, as Linear lists it between the comments: the person's 16px picture on the
 * timeline's rule, their name, what they did and when, in the quiet 13px ink.
 */
export function ActivityLine({ entry, names }: { entry: TimelineEntry; names: ActivityNames }) {
  return <li className={styles.event}>
    <span className={styles.mark}>{entry.actorId ? <DefaultAvatar seed={entry.actorId} name={entry.actorName ?? ''} size={16} /> : <span className={styles.dot} />}</span>
    <p className={styles.eventText}>
      <span className={styles.actor}>{actorText(entry)}</span> {activityText(entry, names)}
      <time className={styles.time} dateTime={entry.at} title={new Date(entry.at).toLocaleString('ko-KR')}> · {agoText(entry.at)}</time>
    </p>
  </li>;
}
