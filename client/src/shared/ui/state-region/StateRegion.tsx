import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFillRoom } from '../use-fill-room';
import styles from './state-region.module.css';

/** How far down the window a page's message starts, whatever bars stand above its room. */
const ANCHOR = 0.32;

/**
 * States share the room their container leaves; loading sits exactly at its centre. A page's message starts at one
 * height in the window (ANCHOR) rather than in its room, so it stays put going between pages and views whose bars
 * differ (a filter row, a tab strip); a room too short or too far down for that keeps it as low as it can go.
 */
export function StateRegion({ children, placement = 'upper', isCompact = false, label, busy = false }: {
  children?: ReactNode; placement?: 'upper' | 'center'; isCompact?: boolean; label?: string; busy?: boolean;
}) {
  const room = useFillRoom<HTMLDivElement>(!isCompact);
  const content = useRef<HTMLDivElement>(null);
  const isAnchored = placement === 'upper' && !isCompact;
  useLayoutEffect(() => {
    const box = room.current;
    const group = content.current;
    if (!isAnchored || !box || !group) return undefined;
    const place = () => {
      const top = box.getBoundingClientRect().top;
      const spare = box.getBoundingClientRect().height - group.getBoundingClientRect().height + (parseFloat(group.style.marginBlockStart) || 0);
      group.style.marginBlockStart = `${Math.round(Math.min(Math.max(window.innerHeight * ANCHOR - top, 0), Math.max(spare, 0)))}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(box);
    observer.observe(group);
    window.addEventListener('resize', place);
    return () => { observer.disconnect(); window.removeEventListener('resize', place); group.style.marginBlockStart = ''; };
  }, [isAnchored, room]);
  return <div ref={room} className={styles.room} data-placement={placement} data-compact={isCompact || undefined} data-anchored={isAnchored || undefined}
    aria-busy={busy || undefined} aria-label={label} role={busy ? 'status' : undefined}>
    <div ref={content} className={styles.content}>{children}</div>
  </div>;
}
