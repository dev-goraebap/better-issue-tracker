import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavIcon } from '../NavIcon';
import type { SlashStore } from './slash';
import styles from './markdown.module.css';

/** The menu's height it keeps room for below the caret before it opens above instead. */
const ROOM = 320;

/**
 * The block menu '/' opens (SlashCommand), drawn where the caret is: each block's icon, name and its Markdown hint, the
 * highlighted one following the arrows; a press picks one (a tap on a phone). Nothing matching says so.
 */
export function SlashMenu({ store }: { store: SlashStore }) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const list = useRef<HTMLDivElement>(null);
  const [isAbove, setAbove] = useState(false);
  useLayoutEffect(() => {
    if (state?.rect) setAbove(window.innerHeight - state.rect.bottom < ROOM && state.rect.top > ROOM);
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [state]);
  if (!state?.rect) return null;
  const { rect, items, index, pick } = state;
  const place = isAbove ? { left: rect.left, bottom: window.innerHeight - rect.top + 6 } : { left: rect.left, top: rect.bottom + 6 };
  return <div ref={list} className={styles.slash} style={{ ...place, maxHeight: ROOM - 20 }} role="listbox" aria-label="블록 바꾸기"
    onMouseDown={event => event.preventDefault()}>
    {items.length === 0 ? <p className={styles.slashEmpty}>맞는 블록이 없습니다</p>
      : items.map((item, at) => <button key={item.id} type="button" role="option" aria-selected={at === index} className={styles.slashItem} onClick={() => pick(item)}>
        <span className={styles.slashIcon}><NavIcon name={item.icon} /></span><span className={styles.slashLabel}>{item.label}</span><kbd className={styles.slashHint}>{item.hint}</kbd>
      </button>)}
  </div>;
}
