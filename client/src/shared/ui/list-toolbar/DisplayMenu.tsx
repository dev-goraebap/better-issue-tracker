import { NavIcon } from '../NavIcon';
import { ListSortMenu, type ListSort } from '../sort-menu';
import type { ListViews } from './ListToolbar';
import styles from './header-tools.module.css';

/**
 * What the 표시 button opens, as Linear's display options: the list's views as tiles across the top (the one in view
 * pressed), then its order (ListSortMenu) under them. Picking a view or an order applies at once and keeps the menu
 * open; the order's reset closes it (onDone). size lg gives a phone's sheet touch-sized tiles and rows.
 */
export function DisplayMenu({ views, sort, onDone, size = 'sm' }: { views?: ListViews; sort?: ListSort; onDone: () => void; size?: 'sm' | 'lg' }) {
  return <div className={styles.display} data-size={size}>
    {views && <div role="radiogroup" aria-label={views.label} className={styles.views}>
      {views.options.map(option => <button key={option.value} type="button" role="radio" aria-checked={option.value === views.value} className={styles.view}
        onClick={() => views.onChange(option.value)}><NavIcon name={option.icon} /><span>{option.label}</span></button>)}
    </div>}
    {views && sort && <hr className={styles.displayRule} />}
    {sort && <ListSortMenu sort={sort} size={size} onDone={onDone} />}
  </div>;
}
