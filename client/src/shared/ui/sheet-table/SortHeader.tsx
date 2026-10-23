import { Popover } from '@astryxdesign/core';
import { useState } from 'react';
import { NavIcon } from '../NavIcon';
import { ListSortMenu, type ListSort } from '../sort-menu';
import styles from './sheet-table.module.css';

/**
 * A sortable header: the whole cell is a button, its name and a chevron, opening the column's menu as Plane's is: the
 * two ways of the key this column is (column) in the list's order, and the reset.
 */
export function SortHeader({ label, order, column }: { label: string; order: ListSort; column: string }) {
  const [isOpen, setOpen] = useState(false);
  const close = () => setOpen(false);
  return <Popover isOpen={isOpen} onOpenChange={setOpen} placement="below" alignment="start" width={200} label={`${label} 정렬`} className={styles.menu}
    content={<ListSortMenu sort={order} column={column} onDone={close} />}>
    {({ ref, onClick }) => <span ref={ref} className={styles.sortWrap}>
      <button type="button" className={styles.sortHead} aria-expanded={isOpen} onClick={onClick}>
        <span>{label}</span><NavIcon name="chevron-down" />
      </button>
    </span>}
  </Popover>;
}
