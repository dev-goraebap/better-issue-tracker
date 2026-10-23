import type { ReactNode } from 'react';
import styles from './frame.module.css';

/** The body of a dialog, sheet or panel, the part that scrolls; isStack spaces a short form's fields evenly. */
export function FrameBody({ isStack = false, children }: { isStack?: boolean; children: ReactNode }) {
  return <div className={`${styles.body} ${isStack ? styles.stack : ''}`}>{children}</div>;
}
