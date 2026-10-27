import type { ReactNode } from 'react';
import styles from './timeline.module.css';

/**
 * One entry on a Timeline's rule. A line is its mark on the rule (a bare 16px icon, the rule stopping short around it)
 * and a single 13px sentence; a card (a comment) spans the whole width over the rule and carries its own picture, so it
 * has no mark, and the rule's line falls on that picture.
 */
export function TimelineItem({ mark, kind = 'line', tone, children }: {
  mark?: ReactNode; kind?: 'line' | 'card';
  /** Colours a line's mark: a pull request's state, as GitHub colours them. */
  tone?: 'open' | 'merged' | 'closed' | 'draft';
  children: ReactNode;
}) {
  return <li className={styles.item} data-kind={kind}>
    {kind === 'line' && <span className={styles.mark} data-tone={tone}>{mark}</span>}
    <div className={styles.body}>{children}</div>
  </li>;
}
