import type { Cover } from '../model/manual';
import styles from './manuals.module.css';

/** Decorative, code-native cover artwork. The title below it owns the accessible name. */
export function ManualCover({ cover, image }: { cover: Cover; image?: string }) {
  return <div className={styles.cover} data-cover={cover} aria-hidden="true">{image ? <img src={image} alt="" /> :
    <svg viewBox="0 0 440 180" fill="none">
      <path className={styles.gridLine} d="M0 60h440M0 120h440M73 0v180M147 0v180M220 0v180M293 0v180M367 0v180" />
      {cover === 'book' ? <g stroke="currentColor" strokeWidth="1.6"><path fill="var(--manual-cover-paper)" d="m124 42 82 12 20 14 19-14 71-12v105l-72 12-18 9-20-9-82-12z" /><path d="M226 68v100M140 67l53 8m-53 9 53 8m-53 9 53 8m-53 9 36 6m125-57-46 8m46 9-46 8m46 9-46 8m46 9-31 5" /></g>
      : cover === 'structure' ? <g stroke="currentColor" strokeWidth="1.6"><path d="M220 74v28M147 102h146M147 102v20m146-20v20" /><rect x="183" y="29" width="74" height="46" rx="7" fill="var(--manual-cover-paper)" /><rect x="110" y="122" width="74" height="38" rx="7" fill="var(--manual-cover-paper)" /><rect x="256" y="122" width="74" height="38" rx="7" fill="var(--manual-cover-paper)" /><path d="M202 46h36m-36 10h24M127 140h40m105 0h40" /></g>
      : <g stroke="currentColor" strokeWidth="1.6"><path strokeDasharray="5 6" d="M119 123h74q27 0 27-28t27-28h74" /><circle cx="119" cy="123" r="20" fill="var(--manual-cover-paper)" /><circle cx="220" cy="95" r="12" fill="var(--manual-cover-paper)" /><circle cx="321" cy="67" r="20" fill="var(--manual-cover-paper)" /><path d="m113 123 5 5 9-11m189-50 5 5 9-11" /></g>}
    </svg>}</div>;
}
