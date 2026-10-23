import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PageChromeContext } from '../page-chrome';
import { PageWidthContext } from './page-width';
import styles from './page-foot.module.css';

/**
 * A page's one foot row, the same on every page: a way back or a secondary action at its start (start), the page's
 * actions at its end (children; a row that lays itself out across the whole width, such as StepActions, takes the end
 * whole). The shell keeps a place for it at the card's bottom, so it sits at the bottom of the window while the page is
 * short and stays there while the page scrolls under it, on a phone above the home indicator; its content lines up
 * with the page's width. Outside the shell it follows the page. isFallback marks the foot a page gets when it has none
 * of its own (a phone's way back); a page's own foot puts it away.
 */
export function PageFoot({ start, isFallback = false, children }: { start?: ReactNode; isFallback?: boolean; children?: ReactNode }) {
  const { foot } = useContext(PageChromeContext);
  const width = useContext(PageWidthContext);
  const row = <div className={styles.foot} data-action-row data-fallback={isFallback || undefined}>
    <div className={styles.inner} data-width={width}>
      {start && <div className={styles.start}>{start}</div>}
      {children && <div className={styles.end}>{children}</div>}
    </div>
  </div>;
  return foot ? createPortal(row, foot) : row;
}
