import styles from './work-item.module.css';

/** Linear's mark for no priority: three quiet dashes where the bars would be. */
export function NoPriority() {
  return <span className={styles.noPriority} aria-label="우선순위 없음">
    <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h2M6 7h2M10 7h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
  </span>;
}
