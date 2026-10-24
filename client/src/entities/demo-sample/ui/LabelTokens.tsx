import styles from './demo.module.css';

/** Each label's dot, as a workspace label keeps one colour; a label the sample does not know takes grey. */
const COLORS: Record<string, string> = { 서버: '#5e6ad2', 화면: '#4cb782', MCP: '#bb87fc', 문서: '#4ea7fc', 배포: '#f2994a', 버그: '#eb5757' };

/** A row's labels as Linear's (D-067): a pill each on a hairline, its colour's dot before the name. */
export function LabelTokens({ labels }: { labels: string[] }) {
  return <span className={styles.labels}>{labels.map(label => <span key={label} className={styles.label}>
    <span className={styles.labelDot} style={{ background: COLORS[label] ?? '#95959f' }} aria-hidden="true" />{label}
  </span>)}</span>;
}
