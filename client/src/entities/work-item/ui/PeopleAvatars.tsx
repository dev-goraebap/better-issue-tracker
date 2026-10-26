import type { ComponentProps } from 'react';
import { DefaultAvatar } from '@/shared/ui';
import type { WorkItemPerson } from './PersonCell';
import styles from './work-item.module.css';

/** Up to three of the people as overlapping pictures, then +N, for a card's corner. */
export function PeopleAvatars({ people, size = 20 }: { people: readonly WorkItemPerson[]; size?: ComponentProps<typeof DefaultAvatar>['size'] }) {
  if (people.length === 0) return null;
  const shown = people.slice(0, 3);
  return <span className={styles.stack} title={people.map(person => person.name).join(', ')}>
    {shown.map(person => <DefaultAvatar key={person.id} seed={person.id} name={person.name} size={size} />)}
    {people.length > shown.length && <span className={styles.more}>+{people.length - shown.length}</span>}
  </span>;
}
