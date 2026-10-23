import { TextInput } from '@astryxdesign/core';
import { NavIcon } from '../NavIcon';
import type { ListSearch } from './ListToolbar';
import { useSearchDraft } from './use-search-draft';
import styles from './list-toolbar.module.css';

/** Search text kept as typed and applied after a pause; a change of the URL elsewhere (a reset, going back) wins. */
export function SearchField({ label, placeholder, value, onChange }: ListSearch) {
  const [draft, setDraft] = useSearchDraft(value, onChange);
  return <div className={styles.search}>
    <TextInput label={label} isLabelHidden placeholder={placeholder} value={draft} onChange={setDraft}
      startIcon={<NavIcon name="search" />} hasClear width="100%" />
  </div>;
}
