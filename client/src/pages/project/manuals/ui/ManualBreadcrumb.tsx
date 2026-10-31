import { NavIcon } from '@/shared/ui';
import styles from './manuals.module.css';

export function ManualBreadcrumb({ title, section, onBack }: { title?: string; section?: string; onBack: () => void }) {
  if (!title) return <h1 className={styles.headerTitle}>매뉴얼</h1>;
  return <div className={styles.headerPath} aria-label="매뉴얼 경로">
    <button type="button" onClick={onBack}>매뉴얼</button><NavIcon name="forward" /><span title={title}>{title}</span>
    {section && <><NavIcon name="forward" /><span className={styles.sectionCrumb} title={section}>{section}</span></>}
  </div>;
}
