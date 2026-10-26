import { PRIORITIES } from '../model/labels';
import type { Priority } from '../model/issue';
import styles from './issue.module.css';

const BARS: Record<Exclude<Priority, 'urgent'>, number> = { high: 3, medium: 2, low: 1 };

/**
 * A priority as Linear draws it (D-067): 긴급 an orange square with an exclamation, the others three bars with as many
 * lit as the priority is high, then its name (unless only the mark is asked for).
 */
export function PriorityMark({ priority, isLabelHidden = false }: { priority: Priority; isLabelHidden?: boolean }) {
  return <span className={styles.priority} data-level={priority} role={isLabelHidden ? 'img' : undefined} aria-label={isLabelHidden ? PRIORITIES[priority] : undefined}>
    <svg viewBox="0 0 14 14" aria-hidden="true">
      {priority === 'urgent'
        ? <><rect x="1" y="1" width="12" height="12" rx="3" fill="currentColor" /><path d="M7 4v3.5M7 9.6v.1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /></>
        : [[1.5, 8, 5], [5.5, 5, 8], [9.5, 2, 11]].map(([x, y, h], index) => <rect key={x} x={x} y={y} width="3" height={h} rx="1"
          fill="currentColor" opacity={index < BARS[priority] ? 1 : 0.28} />)}
    </svg>
    {!isLabelHidden && PRIORITIES[priority]}
  </span>;
}
