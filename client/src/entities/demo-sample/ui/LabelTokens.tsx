import { Token } from '@astryxdesign/core';
import styles from './demo.module.css';

/** A row's labels as small plain tokens. */
export function LabelTokens({ labels }: { labels: string[] }) {
  return <span className={styles.labels}>{labels.map(label => <Token key={label} size="sm" label={label} />)}</span>;
}
