import { IconButton, Text } from '@astryxdesign/core';
import type { ReactNode } from 'react';
import { NavIcon } from '../NavIcon';
import styles from './frame.module.css';

/**
 * The head of a dialog, sheet or panel: back (when there is a page before), the title with a line under it, the
 * frame's own actions, and close. isFull marks a full-screen frame on a phone, whose head clears the status bar. In a
 * bottom sheet close is not shown: the sheet's grab handle, a press outside and back close it, as every sheet does.
 */
export function FrameHead({ title, subtitle, wrapsTitle = false, onBack, actions, onClose, isFull = false, titleId }: {
  title: string; subtitle?: string; wrapsTitle?: boolean; onBack?: () => void; actions?: ReactNode; onClose?: () => void; isFull?: boolean; titleId?: string;
}) {
  return <div className={styles.head} data-full={isFull || undefined}>
    {onBack && <IconButton label="이전 페이지" variant="ghost" size="sm" icon={<NavIcon name="back" />} onClick={onBack} />}
    <div className={styles.headText}>
      <h2 id={titleId} className={styles.title} data-wraps={wrapsTitle || undefined}>{title}</h2>
      {subtitle && <Text type="supporting" color="secondary">{subtitle}</Text>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
    {onClose && <span className={styles.close}><IconButton label="닫기" variant="ghost" size="sm" icon={<NavIcon name="close" />} onClick={onClose} /></span>}
  </div>;
}
