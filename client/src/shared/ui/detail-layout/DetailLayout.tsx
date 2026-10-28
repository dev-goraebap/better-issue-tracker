import type { ReactNode } from 'react';
import styles from './detail-layout.module.css';

/** One reading column for work and documents, with property chips between the title and body. */
export function DetailLayout({ title, context, properties, children }: {
  /** The title as read, or the box it is written in (D-107). */
  title: ReactNode; context?: ReactNode; properties: ReactNode; children: ReactNode;
}) {
  return <div className={styles.frame}><div className={styles.layout}>
    <header className={styles.heading}>{context}<h1>{title}</h1></header>
    <div className={styles.properties} aria-label="속성">{properties}</div>
    <div className={styles.body}>{children}</div>
  </div></div>;
}
