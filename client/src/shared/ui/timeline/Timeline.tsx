import type { ReactNode } from 'react';
import styles from './timeline.module.css';

/**
 * A history as GitHub draws an issue's (BIT-84): one 1px rule down the left that every entry (TimelineItem) hangs on,
 * from the first entry to the last, so what happened reads as one line through time. 활동 and 연결된 코드 use the same
 * rule, marks and spacing.
 */
export function Timeline({ label, children }: { label?: string; children: ReactNode }) {
  return <ol className={styles.timeline} aria-label={label}>{children}</ol>;
}
