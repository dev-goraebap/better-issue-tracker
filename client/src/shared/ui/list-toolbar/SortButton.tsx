import { Popover } from '@astryxdesign/core';
import { useState } from 'react';
import { NavIcon } from '../NavIcon';
import { ListSortMenu, type ListSort } from '../sort-menu';
import styles from './header-tools.module.css';

/** The header's 정렬, drawn as 필터 is (the icon inside a ruled button), opening the list's sort menu (key and way). */
export function SortButton({ sort }: { sort: ListSort }) {
  const [isOpen, setOpen] = useState(false);
  return <Popover isOpen={isOpen} onOpenChange={setOpen} placement="below" alignment="end" width={200} label="정렬" className={styles.menu}
    content={<ListSortMenu sort={sort} onDone={() => setOpen(false)} />}>
    {({ ref, onClick }) => <span ref={ref} className={styles.trigger}>
      <button type="button" className={styles.filterButton} aria-haspopup="menu" aria-expanded={isOpen} onClick={onClick}><NavIcon name="sort" />정렬</button>
    </span>}
  </Popover>;
}
