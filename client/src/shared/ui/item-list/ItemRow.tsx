import type { ReactNode } from 'react';
import styles from './item-list.module.css';

/**
 * One row of an ItemList, 44px: a mark before the title (a pin, say), the title (14px, primary; a link with
 * ITEM_ROW_LINK opens the row from anywhere on it), and the row's properties at its end, small (12px) and in the
 * secondary colour, each ItemMeta keeping its width so they line up from row to row. A row to notice (an unread one)
 * lies on the accent surface with its title bold.
 */
export function ItemRow({ lead, title, meta, tone }: { lead?: ReactNode; title: ReactNode; meta?: ReactNode; tone?: 'accent' }) {
  return <li className={styles.row} data-tone={tone}>
    {lead && <span className={styles.lead}>{lead}</span>}
    <span className={styles.title}>{title}</span>
    {meta && <span className={styles.meta}>{meta}</span>}
  </li>;
}
