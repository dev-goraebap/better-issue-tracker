import styles from './auth.module.css';
export function SectionHeader({ title }: { title: string }) { return <h2 className={styles.sectionHeader}>{title}</h2>; }
