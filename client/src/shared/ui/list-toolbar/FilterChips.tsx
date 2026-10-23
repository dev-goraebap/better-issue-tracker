import { NavIcon } from '../NavIcon';
import { filterValueText, type ListFilter } from './ListToolbar';
import styles from './mobile-tools.module.css';

/**
 * A phone's conditions in force under the toolbar, one row that scrolls sideways: the search words, then each filter
 * set, a chip each ([name] what it is set to, ×). Pressing a filter's chip opens its values; the search's opens the search
 * screen. Nothing shows while nothing is in force.
 */
export function FilterChips({ filters, query, onOpenFilter, onRemove, onOpenSearch, onClearSearch }: {
  filters: ListFilter[]; query?: string;
  onOpenFilter: (key: string) => void; onRemove: (key: string) => void;
  onOpenSearch: () => void; onClearSearch: () => void;
}) {
  const active = filters.filter(filter => filter.value !== undefined);
  if (active.length === 0 && !query) return null;
  return <div className={styles.chips} role="list" aria-label="걸린 조건">
    {query && <span role="listitem" className={styles.chip}>
      <button type="button" className={styles.chipOpen} onClick={onOpenSearch}><NavIcon name="search" /><span className={styles.chipValue}>{query}</span></button>
      <button type="button" className={styles.chipRemove} aria-label="검색어 지우기" onClick={onClearSearch}><NavIcon name="close" /></button>
    </span>}
    {active.map(filter => <span key={filter.key} role="listitem" className={styles.chip}>
      <button type="button" className={styles.chipOpen} onClick={() => onOpenFilter(filter.key)}>
        <span className={styles.chipName}>{filter.label}</span><span className={styles.chipValue}>{filterValueText(filter)}</span>
      </button>
      <button type="button" className={styles.chipRemove} aria-label={`${filter.label} 필터 지우기`} onClick={() => onRemove(filter.key)}><NavIcon name="close" /></button>
    </span>)}
  </div>;
}
