import { BottomSheet, Button } from '@astryxdesign/core';
import { useId } from 'react';
import { FrameBody, FrameFoot, FrameHead } from '../frame';
import { NavIcon } from '../NavIcon';
import { clearedValues, filterValueText, type ListFilter, type ListFilterValues } from './ListToolbar';
import { FilterValues } from './FilterValues';
import styles from './mobile-tools.module.css';

/**
 * A phone's filters in a bottom sheet as tall as what it holds, in two steps as the desktop's filters row is: first every
 * filter with what it is set to, then, pressed, that filter's values in the same sheet (the head's back arrow returns to
 * the filters). Each choice applies at once; 모두 지우기 takes every filter off, 완료 closes the sheet. The sheet is the
 * shared frame (FrameHead, FrameBody, FrameFoot): the head and foot stay while the body scrolls. view opens it on the
 * filters (list) or on one filter's values, as a chip under the toolbar does.
 */
export function FilterSheet({ filters, view, onViewChange, onChange, onClose }: {
  filters: ListFilter[]; view: 'list' | string; onViewChange: (view: 'list' | string) => void;
  onChange: (values: ListFilterValues) => void; onClose: () => void;
}) {
  const titleId = useId();
  const filter = view === 'list' ? undefined : filters.find(each => each.key === view);
  const hasActive = filters.some(each => each.value !== undefined);
  const title = filter ? filter.label : '필터';
  return <BottomSheet isOpen onOpenChange={isOpen => { if (!isOpen) onClose(); }} label={title} height="hug">
    <FrameHead title={title} titleId={titleId} onBack={filter ? () => onViewChange('list') : undefined} onClose={onClose} />
    <FrameBody>
      {filter
        ? <FilterValues filter={filter} size="lg" onChange={value => onChange({ [filter.key]: value })} onDone={() => onViewChange('list')} />
        : <ul className={styles.filterList}>{filters.map(each => <li key={each.key}>
          <button type="button" className={styles.filterRow} onClick={() => onViewChange(each.key)}>
            {each.icon && <span className={styles.filterIcon}><NavIcon name={each.icon} /></span>}
            <span className={styles.filterName}>{each.label}</span>
            <span className={styles.filterValue} data-set={each.value !== undefined || undefined}>
              {each.value !== undefined ? filterValueText(each) : '전체'}
            </span>
            <NavIcon name="forward" />
          </button>
        </li>)}</ul>}
    </FrameBody>
    <FrameFoot start={hasActive ? <Button label="모두 지우기" variant="ghost"
      onClick={() => onChange(clearedValues(filters))} /> : undefined}>
      <Button label="완료" variant="primary" onClick={onClose} />
    </FrameFoot>
  </BottomSheet>;
}
