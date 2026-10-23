import { Button } from '@astryxdesign/core';
import { NavIcon } from '../NavIcon';
import { PageFoot } from '../page-foot';
import type { ListSearch } from './ListToolbar';
import { useSearchDraft } from './use-search-draft';
import styles from './mobile-tools.module.css';

/**
 * The phone's search screen's bar, in place of the toolbar: the search box across the whole row, a magnifier inside it,
 * typed in at once, its words applied after a pause and at once on the keyboard's search key, × emptying it. The page's
 * foot row (PageFoot) starts with the way back to the list (onClose), as the phone's back does.
 */
export function SearchScreenBar({ label, placeholder, value, onChange, onClose }: ListSearch & { onClose: () => void }) {
  const [draft, setDraft] = useSearchDraft(value, onChange);
  return <div className={styles.searchBar}>
    <form role="search" className={styles.searchForm} onSubmit={event => { event.preventDefault(); onChange(draft.trim() || undefined); }}>
      <NavIcon name="search" />
      <input type="search" enterKeyHint="search" aria-label={label} placeholder={placeholder} value={draft} autoFocus
        className={styles.searchInput} onChange={event => setDraft(event.target.value)} />
      {draft && <button type="button" className={styles.searchClear} aria-label="검색어 지우기" onClick={() => { setDraft(''); onChange(undefined); }}>
        <NavIcon name="close" />
      </button>}
    </form>
    <PageFoot start={<Button label="목록으로" variant="secondary" icon={<NavIcon name="back" />} onClick={onClose} />} />
  </div>;
}
