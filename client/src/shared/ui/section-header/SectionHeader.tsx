import type { ReactNode } from 'react';
import styles from './section-header.module.css';

/**
 * The head of a section inside a page: its name as a small, quiet label, with the section's action, if any, at the end.
 * No large heading and no rule, so the page title stays the only title. The name is still a level-2 heading for screen readers; id lets the section name
 * itself by it.
 */
export function SectionHeader({ title, id, actions }: { title: string; id?: string; actions?: ReactNode }) {
  return <div className={styles.head}>
    <h2 id={id} className={styles.title}>{title}</h2>
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>;
}
