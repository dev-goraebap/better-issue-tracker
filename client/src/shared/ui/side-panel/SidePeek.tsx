import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './side-panel.module.css';

const WIDTH_KEY = 'bit.peek.width';
const MIN_WIDTH = 520;
const START_WIDTH = 640;
const STEP = 16;

/** The width the member last left the panel at, in this browser. */
const storedWidth = () => {
  try { const value = Number(localStorage.getItem(WIDTH_KEY)); return value >= MIN_WIDTH ? Math.round(value) : START_WIDTH; } catch { return START_WIDTH; }
};
/** The page's card the panel sits in (the app shell's data-peek-host), or the window when there is none. */
const findHost = () => document.querySelector<HTMLElement>('[data-peek-host]') ?? document.body;
/**
 * The panel may be pulled to the card's middle and no further, but on a narrow card it still opens at its starting
 * width: half a small card is too narrow to read a work item in. It never outgrows the card.
 */
const widest = (host: HTMLElement) => Math.min(host.clientWidth, Math.max(START_WIDTH, Math.round(host.clientWidth / 2)));

/**
 * A detail at the right of the page's card on a desktop (BIT-103): a rectangle the card's whole height, its head on the
 * card's header row, sharing the card's right corners. A clear layer over the rest of the card closes it when pressed,
 * so the list stays in sight. It opens 640px wide; the handle on its left edge (a drag, or ←/→ with it focused) widens
 * it as far as the card's middle (on a narrow card, still 640px) and narrows it to 520px, and the width is kept in
 * this browser. Escape closes it while no dialog is open over it, and focus starts in it. isRouted marks a panel whose
 * pages have their own addresses (data-router-history).
 */
export function SidePeek({ label, isRouted, onClose, children }: { label: string; isRouted: boolean; onClose: () => void; children: ReactNode }) {
  const box = useRef<HTMLElement>(null);
  const [host] = useState(findHost);
  const [width, setWidth] = useState(storedWidth);
  const [room, setRoom] = useState(() => widest(host));
  const [isResizing, setResizing] = useState(false);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => {
    const observer = new ResizeObserver(() => setRoom(widest(host)));
    observer.observe(host);
    return () => observer.disconnect();
  }, [host]);
  useEffect(() => {
    const element = box.current;
    if (element && !element.contains(document.activeElement)) (element.querySelector<HTMLElement>('[data-autofocus]') ?? element).focus({ preventScroll: true });
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      const at = document.activeElement;
      // Escape in a field outside the panel stays that field's (a search clears); in the panel or on the page it closes.
      if (at && !box.current?.contains(at) && at !== document.body && at.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      close.current();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  const shown = Math.min(Math.max(width, MIN_WIDTH), room);
  const keep = (value: number) => { setWidth(value); try { localStorage.setItem(WIDTH_KEY, String(value)); } catch { /* kept for this visit only */ } };
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    setResizing(true);
    let next = shown;
    const move = (moved: globalThis.PointerEvent) => {
      next = Math.min(Math.max(Math.round(host.getBoundingClientRect().right - moved.clientX), MIN_WIDTH), widest(host));
      setWidth(next);
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      setResizing(false);
      keep(next);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };
  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    const by = event.key === 'ArrowLeft' ? STEP : event.key === 'ArrowRight' ? -STEP : 0;
    if (event.key === 'Home') { event.preventDefault(); keep(room); return; }
    if (event.key === 'End') { event.preventDefault(); keep(MIN_WIDTH); return; }
    if (!by) return;
    event.preventDefault();
    keep(Math.min(Math.max(shown + by, MIN_WIDTH), room));
  };
  return createPortal(<>
    <div className={styles.peekOverlay} aria-hidden onClick={() => close.current()} />
    <aside ref={box} role="dialog" aria-modal="false" aria-label={label} tabIndex={-1} className={styles.peek} data-peek data-resizing={isResizing || undefined}
      style={{ inlineSize: shown }}>
      {isRouted && <span data-router-history hidden />}
      <div role="separator" aria-orientation="vertical" aria-label="패널 폭" aria-valuemin={MIN_WIDTH} aria-valuemax={room} aria-valuenow={shown} tabIndex={0}
        title="끌어서 폭 바꾸기 · ←/→" className={styles.peekHandle} onPointerDown={drag} onKeyDown={nudge} />
      <div className={styles.peekContent}>{children}</div>
    </aside>
  </>, host);
}
