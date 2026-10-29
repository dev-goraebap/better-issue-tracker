import type { ReactNode } from 'react';
import styles from './item-list.module.css';

/**
 * One property at an ItemRow's end. Given a width it keeps it, so a property every row has lines up down the list; without
 * one it takes what it needs (one only some rows have, laid left of the rest). A label, when given,
 * is what a screen reader hears in place of the icons and figures shown; a title is shown under the pointer.
 */
export function ItemMeta({ width, label, title, align = 'start', children }: {
  width?: string; label?: string; title?: string; align?: 'start' | 'end'; children?: ReactNode;
}) {
  return <span className={styles.metaItem} style={width ? { inlineSize: width } : undefined} data-align={align} title={title}>
    {label && <span className={styles.spoken}>{label}</span>}
    <span className={styles.metaShown} aria-hidden={label ? true : undefined}>{children}</span>
  </span>;
}
