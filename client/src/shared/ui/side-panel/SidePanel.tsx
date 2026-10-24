import type { ReactNode } from 'react';
import { FrameHead } from '../frame';
import { PanelDialog } from './PanelDialog';
import styles from './side-panel.module.css';

/**
 * A detail opened over what it is about: on a desktop a modal in the middle of the window ('content' as wide as a
 * narrow page, 'compact' for a person or a department), on a phone the whole screen. A ruled header names it, the
 * body scrolls, and a footer, when given, stays at the foot with its action.
 */
export function SidePanel({ title, subtitle, footer, size = 'content', onClose, children }: {
  title: string; subtitle?: string; footer?: ReactNode; size?: 'content' | 'compact'; onClose: () => void; children: ReactNode;
}) {
  return <PanelDialog label={title} size={size} onClose={onClose}>
    <div className={styles.panel}>
      <FrameHead title={title} subtitle={subtitle} isFull onClose={onClose} />
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.foot} data-action-row>{footer}</div>}
    </div>
  </PanelDialog>;
}
