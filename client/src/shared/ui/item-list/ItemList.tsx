import type { ReactNode } from 'react';
import styles from './item-list.module.css';

/**
 * A desktop list as Plane's list layout: rows of ItemRow from the card's edge to its edge, parted by hairlines, with no
 * header; the order is the page's sort menu.
 */
export function ItemList({ label, isBusy, children }: { label: string; isBusy?: boolean; children: ReactNode }) {
  return <ul className={styles.list} aria-label={label} aria-busy={isBusy || undefined}>{children}</ul>;
}
