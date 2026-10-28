import styles from './work-item.module.css';

/** How many of a parent's subtasks are done, as a ring filling up and the count (0/1). */
export function SubtaskProgress({ done, total }: { done: number; total: number }) {
  const turn = 2 * Math.PI * 5;
  return <span className={styles.progress} data-done={done === total || undefined} title={`하위 작업 ${total}개 중 ${done}개 완료`}>
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={`${(done / total) * turn} ${turn}`} transform="rotate(-90 7 7)" />
    </svg>
    {done}/{total}
  </span>;
}
