import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { NavIcon } from '../NavIcon';
import styles from './floating-action.module.css';

/**
 * A phone's way to make something new on a screen that has a create action: the accent + floating at the bottom right,
 * over the tab bar and the home indicator, its name for assistive technology only. The shell gives the tab bar's height
 * (none in the admin space) and, while one is on screen, room under the content so it never covers the last row.
 * A desktop shows nothing; the page keeps its labelled button in the title row or the toolbar there.
 */
export function FloatingAction({ label, icon = 'plus', onClick }: { label: string; icon?: string; onClick: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  if (!isMobile) return null;
  return <button type="button" className={styles.fab} aria-label={label} data-floating-action onClick={onClick}><NavIcon name={icon} /></button>;
}
