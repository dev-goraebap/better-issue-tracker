import { Text } from '@astryxdesign/core';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './select.module.css';

/** One row of a sheet's list: what it picks, what it shows (a label, or anything), and what trails it. */
export type SheetChoice = {
  value: string; label: ReactNode; description?: ReactNode; icon?: ReactNode; end?: ReactNode; isDisabled?: boolean;
};
/** A titled run of rows, as a selector's section. */
export type SheetGroup = { title?: string; choices: SheetChoice[] };

/**
 * The list a phone picks from in a bottom sheet, shared by every field that opens one (times, choices, searches): rows
 * of at least 48px across the sheet, the chosen one in the accent's tint, scrolling in a box of their own. It opens on
 * the chosen row (or the first) in the middle of the box, with focus on it unless something above it keeps the focus (a
 * search box); arrow keys, Home and End move through the rows, and a press or Enter picks.
 */
export function SheetList({ label, groups, value, openAt = value, onPick, isFocused = true, empty }: {
  label: string; groups: SheetGroup[]; value?: string | null; onPick: (value: string) => void;
  /** The row the list opens on when it is not the chosen one (the next time after a time between steps). */
  openAt?: string | null;
  /** Whether the list takes the focus as it opens; a search sheet keeps it in its box. */
  isFocused?: boolean;
  /** What shows when there is nothing to pick. */
  empty?: ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);
  const all = groups.flatMap(group => group.choices);
  const at = Math.max(0, all.findIndex(choice => choice.value === openAt && !choice.isDisabled));
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const box = list.current;
      const item = box?.querySelector<HTMLElement>('[data-current]');
      if (!box || !item) return;
      box.scrollTop = item.offsetTop - (box.clientHeight - item.offsetHeight) / 2;
      if (isFocused) item.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
    // Only as it opens: picking closes the sheet, and a search that changes the rows keeps the list where it is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const move = (event: React.KeyboardEvent) => {
    const rows = [...(list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? [])];
    const here = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? here + 1 : event.key === 'ArrowUp' ? here - 1
      : event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    rows[Math.min(rows.length - 1, Math.max(0, next))]?.focus();
  };
  if (!all.length) return <div className={styles.empty}>{empty}</div>;
  let index = -1;
  return <div ref={list} role="listbox" aria-label={label} className={styles.list} onKeyDown={move}>
    {groups.map((group, groupIndex) => <div key={group.title ?? groupIndex} role="group" aria-label={group.title} className={styles.group}>
      {group.title && <Text type="supporting" color="secondary" className={styles.groupTitle}>{group.title}</Text>}
      {group.choices.map(choice => {
        index += 1;
        const isCurrent = index === at;
        return <button key={choice.value} type="button" role="option" aria-selected={choice.value === value} disabled={choice.isDisabled}
          tabIndex={isCurrent ? 0 : -1} data-current={isCurrent || undefined} data-autofocus={(isFocused && isCurrent) || undefined}
          className={styles.option} onClick={() => onPick(choice.value)}>
          {choice.icon && <span className={styles.icon} aria-hidden="true">{choice.icon}</span>}
          <span className={styles.text}>
            <span className={styles.label}>{choice.label}</span>
            {choice.description && <span className={styles.description}>{choice.description}</span>}
          </span>
          {choice.end && <span className={styles.end}>{choice.end}</span>}
        </button>;
      })}
    </div>)}
  </div>;
}
