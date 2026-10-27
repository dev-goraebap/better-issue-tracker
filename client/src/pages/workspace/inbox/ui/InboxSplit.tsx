import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useFillRoom } from '@/shared/ui';
import styles from './inbox.module.css';

const KEY = 'bit.inbox.list-width';
const initialWidth = () => { try { const width = Number(localStorage.getItem(KEY)); return width >= 256 && width <= 560 ? width : 352; } catch { return 352; } };
/** The list's border is also a pointer/keyboard splitter; its width is a browser preference. */
export function InboxSplit({ children, panelId, isSelected }: { children: ReactNode; panelId: string; isSelected: boolean }) {
  const room = useFillRoom<HTMLDivElement>(true);
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setResizing] = useState(false);
  const live = useRef(width);
  const start = useRef(width);
  const bounds = () => ({ min: 256, max: Math.max(256, Math.min(560, (room.current?.clientWidth ?? 912) - 320)) });
  const change = (value: number) => { const { min, max } = bounds(); live.current = Math.round(Math.max(min, Math.min(max, value))); setWidth(live.current); };
  const save = () => { try { localStorage.setItem(KEY, String(live.current)); } catch { /* The size remains for this visit. */ } };
  useLayoutEffect(() => {
    const element = room.current;
    if (!element) return;
    const observer = new ResizeObserver(() => { if (window.innerWidth >= 1024) change(live.current); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={room} id={panelId} role="tabpanel" className={styles.inbox} data-selected={isSelected || undefined}
    data-resizing={isResizing || undefined} style={{ '--inbox-list-width': `${width}px` } as CSSProperties}>
    {children}
    <div className={styles.splitter} role="separator" aria-label="알림 목록 너비 조절" aria-orientation="vertical" tabIndex={0}
      aria-valuenow={width} aria-valuemin={256} aria-valuemax={560}
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); start.current = live.current; event.currentTarget.setPointerCapture(event.pointerId); setResizing(true); }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId) && room.current) change(event.clientX - room.current.getBoundingClientRect().left); }}
      onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setResizing(false); save(); }}
      onPointerCancel={() => { change(start.current); setResizing(false); }}
      onLostPointerCapture={() => setResizing(false)}
      onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const { min, max } = bounds(); change(event.key === 'Home' ? min : event.key === 'End' ? max : live.current + (event.key === 'ArrowLeft' ? -16 : 16)); save(); }} />
  </div>;
}
