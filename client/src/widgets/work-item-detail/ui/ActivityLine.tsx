import { agoText } from '@/shared/lib/date-text';
import { DefaultAvatar, NavIcon, TimelineItem } from '@/shared/ui';
import type { TimelineEntry } from '../api/timeline';
import { activityIcon, activityPerson, activityText, actorText, type ActivityNames } from '../model/activity-text';
import styles from './activity.module.css';

/**
 * One thing that happened to the work item, as GitHub shows an issue's events (BIT-84): on the timeline's rule, what
 * kind of change it was as an icon, or the picture of the person it is about (담당자, 참석자); then who did it, what
 * and when, in the quiet 13px ink.
 */
export function ActivityLine({ entry, names }: { entry: TimelineEntry; names: ActivityNames }) {
  const person = activityPerson(entry);
  return <TimelineItem mark={person ? <DefaultAvatar seed={person} name={names.people.get(person) ?? ''} size={16} /> : <NavIcon name={activityIcon(entry)} />}>
    <p className={styles.eventText}>
      <span className={styles.actor}>{actorText(entry)}</span> {activityText(entry, names)}
      <time className={styles.time} dateTime={entry.at} title={new Date(entry.at).toLocaleString('ko-KR')}> · {agoText(entry.at)}</time>
    </p>
  </TimelineItem>;
}
