import { DefaultAvatar } from '@/shared/ui';
import type { WorkItem } from '../api/work-item';
import styles from './work-item.module.css';

export type WorkItemPerson = WorkItem['people'][number];

/**
 * The people of a work item in a row (D-092): the first one's picture and name, cut short when narrow, and +N for the
 * rest; nobody reads as a quiet 미배정.
 */
export function PersonCell({ people, empty = '미배정' }: { people: readonly WorkItemPerson[]; empty?: string }) {
  const [first, ...rest] = people;
  if (!first) return <span className={styles.none}>{empty}</span>;
  return <>
    <DefaultAvatar seed={first.id} name={first.name} size={20} />
    <span className={styles.clip}>{first.name}</span>
    {rest.length > 0 && <span className={styles.more} title={rest.map(person => person.name).join(', ')}>+{rest.length}</span>}
  </>;
}
