import type { ReactNode } from 'react';
import { CATEGORY_LABELS, type StatusStep } from '../model/work-item';
import type { ColumnCategory } from '../api/work-item';
import styles from './work-item.module.css';

/**
 * Linear's status marks (D-067), 14px, by the column's category (D-111): 백로그 a dashed ring, 할 일 an empty ring, 진행 중
 * a ring partly filled, 완료 a filled disc with a tick, 취소 a filled disc with a cross. Where a project has more than one
 * column of a category, the step tells them apart as Linear does: 진행 중's ring fills further with each later column (half
 * for one, a third then two thirds for two), and a closing column after the first 취소 draws a pause. Each takes its
 * colour from the mark's data-status.
 */
const GLYPHS: Record<Exclude<ColumnCategory, 'doing'>, ReactNode> = {
  backlog: <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 2" />,
  todo: <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  done: <><circle cx="7" cy="7" r="6.25" fill="currentColor" /><path d="M4.4 7.2 6.2 9l3.4-3.6" fill="none" stroke="var(--color-background-surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>,
  canceled: <><circle cx="7" cy="7" r="6.25" fill="currentColor" /><path d="m5 5 4 4m0-4-4 4" fill="none" stroke="var(--color-background-surface)" strokeWidth="1.5" strokeLinecap="round" /></>,
};
const PAUSED = <><circle cx="7" cy="7" r="6.25" fill="currentColor" /><path d="M5.5 4.75v4.5m3-4.5v4.5" fill="none" stroke="var(--color-background-surface)" strokeWidth="1.5" strokeLinecap="round" /></>;

/** 진행 중's ring with a slice from the top, clockwise, filled as far as the step is along. */
function inProgress(step?: StatusStep) {
  const share = step ? (step.rank + 1) / (step.of + 1) : 0.5;
  const turn = share * 2 * Math.PI;
  const end = `${(7 + 3.5 * Math.sin(turn)).toFixed(2)} ${(7 - 3.5 * Math.cos(turn)).toFixed(2)}`;
  return <><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d={`M7 7V3.5A3.5 3.5 0 ${share > 0.5 ? 1 : 0} 1 ${end}z`} fill="currentColor" /></>;
}

const glyph = (category: ColumnCategory, step?: StatusStep) =>
  category === 'doing' ? inProgress(step) : category === 'canceled' && step && step.rank > 0 ? PAUSED : GLYPHS[category];

/** Where a work item stands: its category's mark and, unless only the mark is asked for, its column's name (or the category's). */
export function StatusBadge({ category, name, step, isLabelHidden = false }: { category: ColumnCategory; name?: string; step?: StatusStep; isLabelHidden?: boolean }) {
  const label = name ?? CATEGORY_LABELS[category];
  return <span className={styles.status} data-status={category} aria-label={isLabelHidden ? label : undefined} role={isLabelHidden ? 'img' : undefined}>
    <svg viewBox="0 0 14 14" aria-hidden="true">{glyph(category, step)}</svg>
    {!isLabelHidden && <span className={styles.clip}>{label}</span>}
  </span>;
}
