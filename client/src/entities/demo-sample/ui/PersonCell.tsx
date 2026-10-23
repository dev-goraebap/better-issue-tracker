import { DefaultAvatar } from '@/shared/ui';
import { personOf } from '../model/mock';
import styles from './demo.module.css';

/** A person in a row: avatar then name, cut short when narrow; nobody reads as a quiet 미배정. */
export function PersonCell({ id }: { id?: string }) {
  const person = personOf(id);
  if (!person) return <span className={styles.none}>미배정</span>;
  return <><DefaultAvatar seed={person.id} name={person.name} size={20} /><span className={styles.clip}>{person.name}</span></>;
}
