import type { ReactNode } from 'react';
import styles from './inline-edit.module.css';

/**
 * A detail's title as read by a member who may write it (D-109): a press asks for the hint, two presses start writing
 * with the caret in the title. Selecting it to copy asks nothing.
 */
export function ReadTitle({ children, onPress, onOpen }: { children: ReactNode; onPress: () => void; onOpen: () => void }) {
  return <span className={styles.readTitle} onClick={() => { if (window.getSelection()?.isCollapsed) onPress(); }}
    onDoubleClick={() => { window.getSelection()?.removeAllRanges(); onOpen(); }}>{children}</span>;
}
