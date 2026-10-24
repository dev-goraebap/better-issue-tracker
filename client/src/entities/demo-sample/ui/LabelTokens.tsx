import { LABEL_COLORS } from '../model/issues';
import styles from './demo.module.css';

/** A row's labels as Linear's (D-067): a pill each on a hairline, its colour's dot before the name. */
export function LabelTokens({ labels }: { labels: string[] }) {
  return <span className={styles.labels}>{labels.map(label => <span key={label} className={styles.label}>
    <span className={styles.labelDot} style={{ background: LABEL_COLORS[label] ?? '#95959f' }} aria-hidden="true" />{label}
  </span>)}</span>;
}
