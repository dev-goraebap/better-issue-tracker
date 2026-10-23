import type { ReactNode } from 'react';
import styles from './frame.module.css';

/** The foot of a dialog, sheet or panel: a secondary action on the left (start), the frame's actions at the end. */
export function FrameFoot({ start, children }: { start?: ReactNode; children: ReactNode }) {
  return <div className={styles.foot} data-action-row>{start}<div className={styles.footEnd}>{children}</div></div>;
}
