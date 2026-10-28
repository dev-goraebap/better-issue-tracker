import type { ReactNode } from 'react';
import { NavIcon } from '../NavIcon';
import styles from './item-list.module.css';

/**
 * A group's header in an ItemList, as Linear's (D-106): a band across the list with a chevron, the group's mark, its name
 * and how many it holds. Pressing it folds the rows under it away and back.
 */
export function ItemGroup({ label, mark, count, isOpen, onToggle }: { label: string; mark?: ReactNode; count: number; isOpen: boolean; onToggle: () => void }) {
  return <li className={styles.group}>
    <button type="button" className={styles.groupButton} aria-expanded={isOpen} onClick={onToggle}>
      <span className={styles.groupChevron} data-open={isOpen || undefined}><NavIcon name="chevron-down" /></span>
      {mark && <span className={styles.groupMark}>{mark}</span>}
      <span className={styles.groupLabel}>{label}</span>
      <span className={styles.groupCount}>{count}</span>
    </button>
  </li>;
}
