import type { CSSProperties } from 'react';
import type { ListLine } from '../model/grouping';
import styles from './work-item.module.css';

const at = (level: number) => ({ '--level': level }) as CSSProperties;

/**
 * The lines tying a subtask's row to its parent (D-106), drawn over the row's inset: a line on through each level whose
 * ancestor has a sibling still to come, an elbow into the row itself (on down too when a sibling follows), and a stem
 * down from under the row's own front when its subtasks follow.
 */
export function TreeLines({ line }: { line: ListLine }) {
  const own = line.depth - 1;
  return <span className={styles.tree} aria-hidden="true">
    {line.guides.map((runs, level) => (runs ? <span key={level} className={styles.treeLine} style={at(level)} /> : null))}
    {line.depth > 0 && <span className={styles.treeElbow} style={at(own)} />}
    {line.depth > 0 && !line.isLast && <span className={styles.treeLine} style={at(own)} />}
    {line.hasChildren && <span className={styles.treeStem} style={at(line.depth)} />}
  </span>;
}
