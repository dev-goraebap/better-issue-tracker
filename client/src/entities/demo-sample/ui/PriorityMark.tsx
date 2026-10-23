import { NavIcon } from '@/shared/ui';
import { PRIORITY_LABELS, type Priority } from '../model/mock';
import styles from './demo.module.css';

/** A priority as its flag and word, urgent and high in their warning colours. */
export function PriorityMark({ priority }: { priority: Priority }) {
  return <span className={styles.priority} data-level={priority}><NavIcon name="priority" />{PRIORITY_LABELS[priority]}</span>;
}
