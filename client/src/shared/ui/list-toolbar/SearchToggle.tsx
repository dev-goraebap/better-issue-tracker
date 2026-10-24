import { Tooltip } from '@astryxdesign/core';
import { useEffect, useRef, useState } from 'react';
import { NavIcon } from '../NavIcon';
import type { ListSearch } from './ListToolbar';
import { useSearchDraft } from './use-search-draft';
import styles from './header-tools.module.css';

/**
 * Search as the header's tools offer it: a magnifier in the round button 필터 and 표시 wear (D-067) that opens into a
 * pill-shaped box of 16rem, typed words applied after a pause.
 * Esc clears the words, then closes; a click elsewhere closes an empty box; the box stays open while it holds words, and a
 * change of the URL elsewhere (a reset, going back) wins over what is typed.
 */
export function SearchToggle({ label, placeholder, value, onChange }: ListSearch) {
  const [draft, setDraft] = useSearchDraft(value, onChange);
  const [isOpen, setOpen] = useState(!!value);
  const box = useRef<HTMLLabelElement>(null);
  const input = useRef<HTMLInputElement>(null);
  // Words that arrive from elsewhere (an address with them) open the box to show them, without taking the focus.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value) setOpen(true);
  }
  // Only the member's own press on the magnifier moves the focus into the box.
  const wantsFocus = useRef(false);
  const openBox = () => { wantsFocus.current = true; setOpen(true); };
  useEffect(() => {
    if (!isOpen) return undefined;
    if (wantsFocus.current) { wantsFocus.current = false; input.current?.focus(); }
    const away = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node) && !input.current?.value) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [isOpen]);
  const close = () => { setDraft(''); onChange(undefined); setOpen(false); };
  if (!isOpen) return <Tooltip content={label}><button type="button" className={styles.roundButton} aria-label={label} onClick={openBox}><NavIcon name="search" /></button></Tooltip>;
  return <label ref={box} className={styles.search}>
    <NavIcon name="search" />
    <input ref={input} aria-label={label} placeholder={placeholder} value={draft} onChange={event => setDraft(event.target.value)}
      onKeyDown={event => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        if (draft) { setDraft(''); onChange(undefined); } else setOpen(false);
      }} />
    <button type="button" className={styles.searchClose} aria-label="검색 닫기" onClick={close}><NavIcon name="close" /></button>
  </label>;
}
