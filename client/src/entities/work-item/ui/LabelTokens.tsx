import type { ItemLabel } from '../api/work-item';
import styles from './issue.module.css';

/** An issue's labels as Linear's (D-067): a pill each on a hairline, its colour's dot before the name. */
export function LabelTokens({ labels }: { labels: readonly ItemLabel[] }) {
  return <span className={styles.labels}>{labels.map(label => <span key={label.id} className={styles.label}>
    <span className={styles.labelDot} style={{ background: label.color }} aria-hidden="true" />{label.name}
  </span>)}</span>;
}
