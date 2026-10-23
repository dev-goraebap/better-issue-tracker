import { BottomSheet, Text, TextInput, type SearchableItem, type TypeaheadProps } from '@astryxdesign/core';
import { useEffect, useState } from 'react';
import { NavIcon } from '../NavIcon';
import { SheetList } from './SheetList';
import styles from './select.module.css';

/**
 * SearchSelect on a phone: the field's box, read-only, opening a tall bottom sheet with a search box over the rows. The
 * rows start as the source's first entries and narrow to what it finds as one types (after the debounce); the keyboard
 * rises only when the search box is tapped, and the sheet makes room for it. Picking closes the sheet; a clearable one
 * offers its placeholder ('일정 없음', say) first while something is chosen.
 */
export function SheetSearchSelect<T extends SearchableItem>({ label, isLabelHidden, description, isOptional, isRequired, status, startIcon, width,
  searchSource, value, onChange, renderItem, placeholder, hasEntriesOnFocus, maxMenuItems = 50, emptySearchResultsText, isDisabled, hasClear,
  debounceMs = 200 }: TypeaheadProps<T>) {
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ items: T[]; isPending: boolean }>({ items: [], isPending: true });
  const words = query.trim();
  useEffect(() => {
    if (!isOpen) return undefined;
    if (!words && !hasEntriesOnFocus) { setFound({ items: [], isPending: false }); return undefined; }
    let isCurrent = true;
    setFound(current => ({ ...current, isPending: true }));
    const timer = setTimeout(() => {
      void Promise.resolve(words ? searchSource.search(words) : searchSource.bootstrap())
        .then(items => { if (isCurrent) setFound({ items: items.slice(0, maxMenuItems), isPending: false }); })
        .catch(() => { if (isCurrent) setFound({ items: [], isPending: false }); });
    }, words ? debounceMs : 0);
    return () => { isCurrent = false; clearTimeout(timer); searchSource.cancel?.(); };
  }, [isOpen, words, hasEntriesOnFocus, searchSource, maxMenuItems, debounceMs]);
  const open = () => { if (!isDisabled) { setQuery(''); setOpen(true); } };
  const pick = (id: string) => {
    setOpen(false);
    if (id === CLEAR) onChange(null);
    else { const item = found.items.find(candidate => candidate.id === id); if (item) onChange(item); }
  };
  const clearRow = hasClear && value && !words ? [{ value: CLEAR, label: placeholder ?? '선택 안 함' }] : [];
  const rows = found.items.map(item => ({ value: item.id, label: renderItem ? renderItem(item) : item.label }));
  return <div className={styles.field} style={{ width: typeof width === 'number' ? `${width}px` : width }}>
    <TextInput label={label} isLabelHidden={isLabelHidden} description={description} isOptional={isOptional} isRequired={isRequired}
      value={value?.label ?? ''} placeholder={placeholder} isReadOnly isDisabled={isDisabled} status={status} startIcon={startIcon}
      role="combobox" aria-haspopup="dialog" aria-expanded={isOpen} onClick={open}
      onKeyDown={event => { if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(); } }} />
    <BottomSheet isOpen={isOpen} onOpenChange={setOpen} label={`${label} 고르기`} height="tall">
      {isOpen && <div className={`${styles.sheet} ${styles.searchSheet}`}>
        <Text type="label" className={styles.sheetTitle}>{label}</Text>
        <div className={styles.search}>
          <TextInput label={`${label} 찾기`} isLabelHidden size="lg" value={query} onChange={setQuery} placeholder={`${label} 찾기`}
            startIcon={<NavIcon name="search" />} hasClear />
        </div>
        <div className={styles.searchBody}>
          <SheetList key={words ? 'found' : 'first'} label={label} groups={[{ choices: [...clearRow, ...rows] }]} value={value?.id ?? (hasClear ? CLEAR : null)}
            onPick={pick} isFocused={false}
            empty={found.isPending ? '찾는 중…' : words ? emptySearchResultsText ?? '찾는 항목이 없습니다' : '적어서 찾으세요'} />
        </div>
      </div>}
    </BottomSheet>
  </div>;
}

/** The row that clears a clearable search; no item's id. */
const CLEAR = '\u0000clear';
