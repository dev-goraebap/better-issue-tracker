import { DefaultAvatar } from '@/shared/ui';
import { PeopleAvatars } from './PeopleAvatars';
import type { WorkItem } from '../api/work-item';
import styles from './work-item.module.css';

export type WorkItemPerson = WorkItem['people'][number];

/** One person keeps their name; several use up to three avatars and a small overflow count. */
export function PersonCell({ people, empty = '미배정' }: { people: readonly WorkItemPerson[]; empty?: string }) {
  const [first] = people;
  if (!first) return <span className={styles.none}>{empty}</span>;
  if (people.length > 1) return <PeopleAvatars people={people} />;
  return <>
    <DefaultAvatar seed={first.id} name={first.name} size={20} />
    <span className={styles.clip}>{first.name}</span>
  </>;
}
