import { LoadingMark } from './LoadingMark';
import styles from './page-loading.module.css';

/** The same rocket in place, for a read the screen starts itself: another tab, another page of a list, a dialog. */
export function InlineLoader({ label = '불러오는 중' }: { label?: string }) {
  return <div className={styles.inline} role="status" aria-label={label}>
    <LoadingMark isSmall />
  </div>;
}
