import type { ReactNode } from 'react';
import styles from './picture-change.module.css';

/** The image itself opens the shared picture chooser, with the same keyboard target everywhere. */
export function PictureButton({ children, label, isDisabled, onClick }: { children: ReactNode; label: string; isDisabled?: boolean; onClick: () => void }) {
  return <button type="button" className={styles.pictureButton} aria-label={label} title={label} disabled={isDisabled} onClick={onClick}>{children}</button>;
}
