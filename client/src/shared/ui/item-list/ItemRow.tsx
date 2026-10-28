import type { CSSProperties, ReactNode } from 'react';
import styles from './item-list.module.css';

/**
 * One row of an ItemList, 44px: a mark before the title (a pin, say), the title (14px, primary; a link with
 * ITEM_ROW_LINK opens the row from anywhere on it), and the row's properties at its end, small (12px) and in the
 * secondary colour, each ItemMeta keeping its width so they line up from row to row. A row to notice (an unread one)
 * lies on the accent surface with its title bold. end is the row's own control (its menu) at the very end, on a phone
 * beside both lines. depth sets the whole row in under the one above it (a subtask under its parent, D-106); guide is
 * what the caller draws over the row's inset (the lines tying it to its parent).
 */
export function ItemRow({ lead, title, meta, end, tone, depth = 0, guide, isTitleSingleLine = false }: {
  lead?: ReactNode; title: ReactNode; meta?: ReactNode; end?: ReactNode; tone?: 'accent'; depth?: number; guide?: ReactNode; isTitleSingleLine?: boolean;
}) {
  return <li className={styles.row} data-tone={tone} data-title-single-line={isTitleSingleLine || undefined} data-depth={depth > 0 ? depth : undefined}
    style={depth > 0 ? { '--depth': depth } as CSSProperties : undefined}>
    {guide}
    {lead && <span className={styles.lead}>{lead}</span>}
    <span className={styles.title}>{title}</span>
    {meta && <span className={styles.meta}>{meta}</span>}
    {end && <span className={styles.end}>{end}</span>}
  </li>;
}
