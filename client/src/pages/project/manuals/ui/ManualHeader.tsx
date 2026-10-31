import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PageChromeContext } from '@/shared/ui';
import styles from './manuals.module.css';

/** The shell owns the only header. Manual content never introduces a second toolbar. */
export function ManualHeader({ children }: { children?: ReactNode }) {
  const targets = useContext(PageChromeContext);
  return <>
    {targets.tools && createPortal(<div className={styles.headerTools}>{children}</div>, targets.tools)}
  </>;
}
