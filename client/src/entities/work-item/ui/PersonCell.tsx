import { DefaultAvatar } from '@/shared/ui';
import styles from './issue.module.css';

/** A person in a row: avatar then name, cut short when narrow; nobody reads as a quiet 미배정. */
export function PersonCell({ id, name }: { id?: string | null; name?: string | null }) {
  if (!id) return <span className={styles.none}>미배정</span>;
  return <><DefaultAvatar seed={id} name={name ?? ''} size={20} /><span className={styles.clip}>{name}</span></>;
}
