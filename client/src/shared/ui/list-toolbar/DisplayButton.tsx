import { Popover, Tooltip } from '@astryxdesign/core';
import { useState } from 'react';
import { NavIcon } from '../NavIcon';
import { isUsualSort, type ListSort } from '../sort-menu';
import { DisplayMenu } from './DisplayMenu';
import type { ListViews } from './ListToolbar';
import styles from './header-tools.module.css';

/**
 * The header's 표시, as Linear's: a round icon button (sliders) opening the list's views and order (DisplayMenu), with a
 * dot on it while the list is not in its first view or its own order.
 */
export function DisplayButton({ views, sort }: { views?: ListViews; sort?: ListSort }) {
  const [isOpen, setOpen] = useState(false);
  const isChanged = (!!views && views.value !== views.options[0]?.value) || (!!sort && !isUsualSort(sort));
  return <Popover isOpen={isOpen} onOpenChange={setOpen} placement="below" alignment="end" width={views ? 340 : 220} label="표시" className={styles.menu}
    content={<DisplayMenu views={views} sort={sort} onDone={() => setOpen(false)} />}>
    {({ ref, onClick }) => <span ref={ref} className={styles.trigger}>
      <Tooltip content="표시">
        <button type="button" className={styles.roundButton} aria-label={isChanged ? '표시, 바뀜' : '표시'} aria-haspopup="dialog" aria-expanded={isOpen} onClick={onClick}>
          <NavIcon name="display" />
        </button>
      </Tooltip>
      {isChanged && <span className={styles.roundDot} aria-hidden="true" />}
    </span>}
  </Popover>;
}
