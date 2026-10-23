import { Kbd, Text } from '@astryxdesign/core';
import { NavIcon } from '../NavIcon';
import styles from './search-palette.module.css';

/**
 * What opens a search: a quiet field with the magnifier, 검색 and the keys that open it too (Ctrl+K or /), which a
 * phone, having no keyboard to press them on, does not show. isWide lets it
 * stretch across a list's bar; otherwise it keeps a field's width and folds to the icon on a narrow desktop.
 */
export function SearchTrigger({ label, onOpen, isWide = false }: { label: string; onOpen: () => void; isWide?: boolean }) {
  return <button type="button" className={styles.trigger} data-wide={isWide || undefined} aria-label={label}
    aria-keyshortcuts="Control+K Meta+K /" onClick={onOpen}>
    <NavIcon name="search" />
    <Text type="supporting" color="secondary">검색</Text>
    <span className={styles.keys}><Kbd keys="mod+k" /></span>
  </button>;
}
