import { BottomSheet, Popover } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { FrameBody, FrameHead } from '../frame';
import { NavIcon } from '../NavIcon';
import styles from './property-picker.module.css';

export type PropertyOption = { value: string; label: string; icon?: ReactNode };

/**
 * One property of an item being made, as Linear's (D-067): a 24px pill showing the value with its mark (or, unset, the
 * property's name in the quiet ink), opening a menu with a search across its top ('우선순위 바꾸기…'), rows of 32px,
 * the chosen ones ticked. Typing narrows the rows; the arrow keys move, Enter picks, and while nothing is typed the
 * number keys pick the first nine. One choice closes the menu; a multiple one (labels) stays open to pick more. A phone
 * opens the same rows in a bottom sheet.
 */
export function PropertyPicker({ label, options, value, onChange, icon, isMultiple = false }: {
  /** The property's name: the pill's text while unset, and the menu's. */
  label: string;
  options: PropertyOption[];
  /** The chosen value, or for a multiple property the chosen values. */
  value?: string | readonly string[];
  onChange: (value: string | string[] | undefined) => void;
  /** The pill's mark while unset (a NavIcon name). */
  icon: string;
  isMultiple?: boolean;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [at, setAt] = useState(0);
  const listId = useId();
  const titleId = useId();
  const list = useRef<HTMLDivElement>(null);
  const chosen = value === undefined ? [] : typeof value === 'string' ? [value] : [...value];
  const shown = useMemo(() => options.filter(option => !query || option.label.toLowerCase().includes(query.toLowerCase())), [options, query]);
  const open = (next: boolean) => { setOpen(next); setQuery(''); setAt(0); };
  const pick = (picked: string) => {
    if (!isMultiple) { onChange(picked === chosen[0] ? chosen[0] : picked); open(false); return; }
    const next = chosen.includes(picked) ? chosen.filter(each => each !== picked) : [...chosen, picked];
    onChange(next);
  };
  const keys = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = Math.min(shown.length - 1, Math.max(0, at + (event.key === 'ArrowDown' ? 1 : -1)));
      setAt(next);
      list.current?.querySelectorAll<HTMLElement>('[role="option"]')[next]?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && shown[at]) { event.preventDefault(); pick(shown[at].value); }
    else if (!query && /^[1-9]$/.test(event.key) && shown[Number(event.key) - 1]) { event.preventDefault(); pick(shown[Number(event.key) - 1]!.value); }
  };
  const shownValue = chosen.length === 0 ? undefined
    : isMultiple ? options.filter(option => chosen.includes(option.value))
    : options.filter(option => option.value === chosen[0]);
  const pill = (ref?: (node: HTMLElement | null) => void, onClick?: () => void) => <span ref={ref} className={styles.wrap}>
    <button type="button" className={styles.pill} data-empty={!shownValue || undefined} aria-haspopup={isMobile ? 'dialog' : 'listbox'} aria-expanded={isOpen}
      aria-label={`${label}: ${shownValue ? shownValue.map(option => option.label).join(', ') : '없음'}`} onClick={onClick ?? (() => open(true))}>
      {shownValue
        ? isMultiple && shownValue.length > 1
          ? <><span className={styles.dots}>{shownValue.map(option => <span key={option.value} className={styles.mark}>{option.icon}</span>)}</span>{label} {shownValue.length}</>
          : <><span className={styles.mark}>{shownValue[0]!.icon}</span>{shownValue[0]!.label}</>
        : <><span className={styles.mark}><NavIcon name={icon} /></span>{label}</>}
    </button>
  </span>;
  const menu = <div className={styles.menu} data-size={isMobile ? 'lg' : undefined}>
    <input className={styles.search} value={query} autoFocus={!isMobile} placeholder={`${label} ${isMultiple ? '고르기' : '바꾸기'}…`} aria-label={`${label} 찾기`}
      aria-controls={listId} aria-activedescendant={shown[at] ? `${listId}-${at}` : undefined}
      onChange={event => { setQuery(event.target.value); setAt(0); }} onKeyDown={keys} />
    <div ref={list} id={listId} role="listbox" aria-label={label} aria-multiselectable={isMultiple || undefined} className={styles.list}>
      {shown.map((option, index) => <div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={chosen.includes(option.value)}
        data-active={index === at || undefined} className={styles.option} onMouseEnter={() => setAt(index)} onClick={() => pick(option.value)}>
        {option.icon && <span className={styles.mark}>{option.icon}</span>}
        <span className={styles.optionLabel}>{option.label}</span>
        {chosen.includes(option.value) && <span className={styles.tick}><NavIcon name="check" /></span>}
        {!isMobile && !query && index < 9 && <kbd className={styles.kbd}>{index + 1}</kbd>}
      </div>)}
      {shown.length === 0 && <p className={styles.empty}>'{query}'에 맞는 {label}이 없습니다</p>}
    </div>
  </div>;
  if (isMobile) return <>
    {pill()}
    {isOpen && <BottomSheet isOpen onOpenChange={open} label={label} height="hug">
      <FrameHead title={label} titleId={titleId} onClose={() => open(false)} />
      <FrameBody>{menu}</FrameBody>
    </BottomSheet>}
  </>;
  return <Popover isOpen={isOpen} onOpenChange={open} placement="below" alignment="start" width={240} label={label} className={styles.popover} content={menu}>
    {({ ref, onClick }) => pill(ref, onClick)}
  </Popover>;
}
