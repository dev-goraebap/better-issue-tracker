import type { ReactNode } from 'react';
import { STATUS_LABELS, type Status } from '../model/mock';
import styles from './demo.module.css';

/**
 * Linear's status marks (D-067), 14px: 할 일 an empty ring, 진행 중 a ring half filled, 검토 a ring three quarters
 * filled, 완료 a filled disc with a tick. Each takes its colour from the mark's data-status.
 */
const GLYPHS: Record<Status, ReactNode> = {
  todo: <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  doing: <><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" /></>,
  review: <><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M7 3.5a3.5 3.5 0 1 1-3.5 3.5H7z" fill="currentColor" /></>,
  done: <><circle cx="7" cy="7" r="6.25" fill="currentColor" /><path d="M4.4 7.2 6.2 9l3.4-3.6" fill="none" stroke="var(--color-background-surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>,
};

/** Where a work item stands: its mark and, unless only the mark is asked for, its name. */
export function StatusBadge({ status, isLabelHidden = false }: { status: Status; isLabelHidden?: boolean }) {
  return <span className={styles.status} data-status={status} aria-label={isLabelHidden ? STATUS_LABELS[status] : undefined} role={isLabelHidden ? 'img' : undefined}>
    <svg viewBox="0 0 14 14" aria-hidden="true">{GLYPHS[status]}</svg>
    {!isLabelHidden && <span>{STATUS_LABELS[status]}</span>}
  </span>;
}
