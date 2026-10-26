import type { ReactNode } from 'react';
import { CATEGORY_LABELS } from '../model/work-item';
import type { ColumnCategory } from '../api/work-item';
import styles from './work-item.module.css';

/**
 * Linear's status marks (D-067), 14px, by the column's category: 할 일 an empty ring, 진행 중 a ring half filled, 완료 a
 * filled disc with a tick. Each takes its colour from the mark's data-status.
 */
const GLYPHS: Record<ColumnCategory, ReactNode> = {
  todo: <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  doing: <><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" /></>,
  done: <><circle cx="7" cy="7" r="6.25" fill="currentColor" /><path d="M4.4 7.2 6.2 9l3.4-3.6" fill="none" stroke="var(--color-background-surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>,
};

/** Where a work item stands: its category's mark and, unless only the mark is asked for, its column's name (or the category's). */
export function StatusBadge({ category, name, isLabelHidden = false }: { category: ColumnCategory; name?: string; isLabelHidden?: boolean }) {
  const label = name ?? CATEGORY_LABELS[category];
  return <span className={styles.status} data-status={category} aria-label={isLabelHidden ? label : undefined} role={isLabelHidden ? 'img' : undefined}>
    <svg viewBox="0 0 14 14" aria-hidden="true">{GLYPHS[category]}</svg>
    {!isLabelHidden && <span className={styles.clip}>{label}</span>}
  </span>;
}
