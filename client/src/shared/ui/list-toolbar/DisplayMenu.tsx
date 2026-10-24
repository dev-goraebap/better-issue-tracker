import { NavIcon } from '../NavIcon';
import { ListSortMenu, type ListSort } from '../sort-menu';
import type { ListDisplay, ListViews } from './ListToolbar';
import styles from './header-tools.module.css';

/**
 * What the 표시 button opens, as Linear's display options: the list's views as pills across the top (the one in view
 * pressed), its order (ListSortMenu) under them, the columns shown as chips to turn on and off, and the page's own foot
 * (초기화, 모두의 기본값으로 저장). Picking applies at once and keeps the menu open; the order's reset closes it
 * (onDone). size lg gives a phone's sheet touch-sized pills and rows.
 */
export function DisplayMenu({ views, sort, display, onDone, size = 'sm' }: { views?: ListViews; sort?: ListSort; display?: ListDisplay; onDone: () => void; size?: 'sm' | 'lg' }) {
  const columns = display?.columns;
  return <div className={styles.display} data-size={size}>
    {views && <div role="radiogroup" aria-label={views.label} className={styles.views}>
      {views.options.map(option => <button key={option.value} type="button" role="radio" aria-checked={option.value === views.value} className={styles.view}
        onClick={() => views.onChange(option.value)}><NavIcon name={option.icon} /><span>{option.label}</span></button>)}
    </div>}
    {views && sort && <hr className={styles.displayRule} />}
    {sort && <ListSortMenu sort={sort} size={size} onDone={onDone} />}
    {columns && <><hr className={styles.displayRule} />
      <p className={styles.displayHeading}>{columns.label}</p>
      <div className={styles.columns} role="group" aria-label={columns.label}>
        {columns.options.map(option => {
          const isOn = columns.value.includes(option.value);
          return <button key={option.value} type="button" className={styles.column} aria-pressed={isOn}
            onClick={() => columns.onChange(isOn ? columns.value.filter(each => each !== option.value) : [...columns.value, option.value])}>{option.label}</button>;
        })}
      </div>
    </>}
    {display?.foot && <div className={styles.displayFoot}>{display.foot}</div>}
  </div>;
}
