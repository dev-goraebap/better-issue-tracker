import { NavIcon } from '../NavIcon';
import { DIRECTION_LABELS, isUsualSort, naturalDirection, type ListSort, type SortDirection } from './list-sort';
import styles from './sort-menu.module.css';

/**
 * A list's order as Plane's menus split it: 정렬 기준 (the keys, the one in force ticked; choosing one takes its natural
 * way), 방향 (the two ways, named for the key's kind, each with its icon), and 정렬 초기화 under a rule, off while the
 * list is in its own order. A column's menu (column, the key the column is) shows only its ways, and its reset only
 * while that column orders the list. Choosing keeps the menu open, as Plane's does, so a key and a way can be chosen
 * together; the reset closes it (onDone). size lg gives a phone's sheet touch rows.
 */
export function ListSortMenu({ sort, column, onDone, size = 'sm' }: {
  sort: ListSort; column?: string; onDone: () => void; size?: 'sm' | 'lg';
}) {
  const shownKey = column ?? sort.key;
  const kind = sort.keys.find(each => each.value === shownKey)?.kind ?? 'date';
  const isActive = !column || column === sort.key;
  const directions: SortDirection[] = kind === 'date' ? ['desc', 'asc'] : ['asc', 'desc'];
  return <div role="menu" className={styles.body} data-size={size}>
    {!column && <>
      <p className={styles.heading}>정렬 기준</p>
      {sort.keys.map(key => <button key={key.value} type="button" role="menuitemradio" aria-checked={key.value === sort.key} className={styles.item}
        onClick={() => { if (key.value !== sort.key) sort.onChange(key.value, naturalDirection(key)); }}>
        <span>{key.label}</span>{key.value === sort.key && <NavIcon name="check" />}
      </button>)}
      <hr className={styles.rule} />
      <p className={styles.heading}>방향</p>
    </>}
    {directions.map(direction => {
      const isOn = isActive && sort.direction === direction;
      return <button key={direction} type="button" role="menuitemradio" aria-checked={isOn} className={styles.item}
        onClick={() => sort.onChange(shownKey, direction)}>
        <span className={styles.itemLabel}><NavIcon name={direction === 'desc' ? 'sort-desc' : 'sort-asc'} />{DIRECTION_LABELS[kind][direction]}</span>
        {isOn && <NavIcon name="check" />}
      </button>;
    })}
    <hr className={styles.rule} />
    <button type="button" role="menuitem" className={styles.item} disabled={!isActive || isUsualSort(sort)}
      onClick={() => { sort.onChange(sort.usual.key, sort.usual.direction); onDone(); }}><span>정렬 초기화</span></button>
  </div>;
}
