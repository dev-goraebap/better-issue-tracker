import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { placeAt, placeFor, stepBy } from './order';

/** A press on a grip that moves this many pixels picks the row up; less is nothing. */
const THRESHOLD = 4;
/** Near the top or bottom of the scrolling box, by this many pixels, it scrolls toward that end, faster closer in. */
const EDGE = 56;
const SPEED = 16;
/** How long the other rows take to make way, and the carried copy to settle into its place. */
const SLIDE_MS = 200;
const SETTLE_MS = 220;
const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

type Row = { id: string; name: string };
/** What a row is called in what is read out: its word, and that word with 을/를 and 은/는 (칸: 칸을, 칸은). */
export type RowNoun = { word: string; object: string; topic: string };
type Carry = { id: string; isSettling: boolean };
type Press = { id: string; pointerId: number; isTouch: boolean; x: number; y: number };
type Ghost = { element: HTMLElement; dx: number; dy: number; height: number };

const isReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const speed = (depth: number) => Math.ceil((Math.min(depth, EDGE) / EDGE) * SPEED);

/** The box that scrolls the list up and down: the nearest scrolling ancestor, else the page. */
function scrollParent(element: HTMLElement): HTMLElement {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return document.scrollingElement as HTMLElement;
}

/**
 * Ordering rows by their grips (a board's columns, a scope's views), as a board's cards are carried (useBoardMove): a mouse, pen or finger on a grip lifts
 * the row as a tilted copy that follows it while the row's place shows as an empty slot the others slide out of the way
 * of; letting go settles the copy into the slot, and Escape puts it back. With a grip focused, Alt + ↑ / ↓ moves the
 * row a place (D-080). The new order shows at once and is sent (send, one at a time, the latest wins); a refused one
 * shows the saved order again. Each step is read out. A reduced-motion setting keeps the order but drops the motion.
 */
export function useRowReorder(rows: readonly Row[], noun: RowNoun, ghostClass: string, send: (order: string[]) => Promise<void>, onError: (failure: unknown) => void) {
  const list = useRef<HTMLDivElement>(null);
  const hint = useId();
  // The order just made, shown while carrying and until the saved one comes back.
  const [moved, setMoved] = useState<string[] | null>(null);
  const [carry, setCarry] = useState<Carry | null>(null);
  const [said, setSaid] = useState('');
  const saved = rows.map(row => row.id);
  const order = moved ? [...moved.filter(id => saved.includes(id)), ...saved.filter(id => !moved.includes(id))] : saved;
  const live = useRef(order);
  live.current = order;
  const carried = useRef<Carry | null>(null);
  const press = useRef<Press | null>(null);
  const ghost = useRef<Ghost | null>(null);
  const start = useRef<string[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const wanted = useRef<string[] | null>(null);
  const isSending = useRef(false);
  const keepsFocus = useRef<string | null>(null);
  const tops = useRef(new Map<string, number>());
  const slides = useRef(new WeakMap<Element, Animation>());
  const sendLatest = useRef(send);
  const onErrorLatest = useRef(onError);
  useLayoutEffect(() => { sendLatest.current = send; onErrorLatest.current = onError; });

  const nameOf = (id: string) => rows.find(row => row.id === id)?.name ?? '';
  const put = (next: Carry | null) => { carried.current = next; setCarry(next); };
  const show = (next: string[]) => { live.current = next; setMoved(next); };
  const rowsIn = () => [...(list.current?.querySelectorAll<HTMLElement>('[data-row]') ?? [])];
  const grabbing = (isOn: boolean) => { if (isOn) document.documentElement.dataset.rowCarrying = ''; else delete document.documentElement.dataset.rowCarrying; };

  /** Sends the order, after the one already on its way; only the last one asked for while waiting goes next. */
  const commit = async (next: string[]) => {
    show(next);
    wanted.current = next;
    if (isSending.current) return;
    isSending.current = true;
    while (wanted.current) {
      const sending = wanted.current;
      wanted.current = null;
      try { await sendLatest.current(sending); }
      catch (failure) { wanted.current = null; onErrorLatest.current(failure); setSaid('순서를 저장하지 못해 되돌렸습니다.'); }
    }
    isSending.current = false;
    if (!carried.current) setMoved(null);
  };

  /** The copy glides into the row's place, untilting, then goes; the row shows again. */
  const settle = (id: string) => {
    const at = ghost.current;
    const slot = list.current?.querySelector<HTMLElement>(`[data-row="${id}"]`);
    const finish = () => { at?.element.remove(); if (ghost.current === at) ghost.current = null; put(null); };
    if (!at || !slot || !list.current || isReduced()) { finish(); return; }
    put({ id, isSettling: true });
    const box = list.current.getBoundingClientRect();
    at.element.dataset.settling = '';
    delete at.element.dataset.lifted;
    at.element.style.transform = `translate(${slot.getBoundingClientRect().left}px, ${box.top + slot.offsetTop}px)`;
    let isDone = false;
    const done = () => { if (!isDone) { isDone = true; finish(); } };
    at.element.addEventListener('transitionend', event => { if (event.propertyName === 'transform') done(); });
    setTimeout(done, SETTLE_MS + 80);
  };

  const release = () => { press.current = null; };
  const drop = () => {
    const now = carried.current;
    release(); grabbing(false);
    if (!now || now.isSettling) return;
    const next = live.current;
    flushSync(() => setMoved(next));
    settle(now.id);
    if (next.join() !== start.current.join()) {
      setSaid(`'${nameOf(now.id)}' ${noun.object} ${next.indexOf(now.id) + 1}번째에 놓았습니다.`);
      void commit(next);
    } else {
      setSaid(`'${nameOf(now.id)}' ${noun.object} 제자리에 두었습니다.`);
      if (!isSending.current) setMoved(null);
    }
  };
  const cancel = () => {
    const now = carried.current;
    release(); grabbing(false);
    if (!now || now.isSettling) return;
    flushSync(() => show(start.current));
    settle(now.id);
    setSaid('옮기기를 취소했습니다.');
  };

  /** The copy follows the pointer and the row's place follows the copy's middle. */
  const follow = (x: number, y: number) => {
    pointer.current = { x, y };
    const at = ghost.current;
    const now = carried.current;
    if (!at || !now || now.isSettling || !list.current) return;
    at.element.style.transform = `translate(${x - at.dx}px, ${y - at.dy}px)`;
    const elements = rowsIn();
    const from = elements.findIndex(element => element.dataset.row === now.id);
    if (from < 0) return;
    const middle = y - at.dy + at.height / 2 - list.current.getBoundingClientRect().top;
    const index = placeFor(elements.map(element => ({ top: element.offsetTop, height: element.offsetHeight })), from, middle);
    const next = placeAt(live.current, now.id, index);
    if (next.join() !== live.current.join()) show(next);
  };

  const lift = (at: Press) => {
    const row = list.current?.querySelector<HTMLElement>(`[data-row="${at.id}"]`);
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const copy = row.cloneNode(true) as HTMLElement;
    copy.removeAttribute('data-row');
    copy.setAttribute('aria-hidden', 'true');
    copy.classList.add(ghostClass);
    copy.style.inlineSize = `${rect.width}px`;
    copy.style.transformOrigin = `${at.x - rect.left}px ${at.y - rect.top}px`;
    copy.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    document.body.append(copy);
    // Lifting is a transition from where the row lay: shown at rest first, then raised and tilted.
    requestAnimationFrame(() => requestAnimationFrame(() => { if (ghost.current?.element === copy && !copy.dataset.settling) copy.dataset.lifted = ''; }));
    ghost.current = { element: copy, dx: at.x - rect.left, dy: at.y - rect.top, height: rect.height };
    start.current = live.current;
    if (at.isTouch) navigator.vibrate?.(8);
    grabbing(true);
    show(live.current);
    put({ id: at.id, isSettling: false });
    setSaid(`'${nameOf(at.id)}' ${noun.object} 집었습니다. ${live.current.indexOf(at.id) + 1}번째.`);
  };

  const onPointerMove = useEffectEvent((event: PointerEvent) => {
    const at = press.current;
    if (!at || event.pointerId !== at.pointerId) return;
    if (carried.current) { follow(event.clientX, event.clientY); return; }
    if (Math.hypot(event.clientX - at.x, event.clientY - at.y) >= THRESHOLD) { lift(at); follow(event.clientX, event.clientY); }
  });
  const onPointerUp = useEffectEvent((event: PointerEvent) => {
    if (press.current?.pointerId !== event.pointerId) return;
    if (carried.current) drop(); else release();
  });
  const onPointerCancel = useEffectEvent((event: PointerEvent) => {
    if (press.current?.pointerId !== event.pointerId) return;
    if (carried.current) cancel(); else release();
  });
  const onEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !press.current || !carried.current) return;
    event.preventDefault(); event.stopPropagation(); cancel();
  });
  const onScrolled = useEffectEvent(() => follow(pointer.current.x, pointer.current.y));

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onEscape, true);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onEscape, true);
      ghost.current?.element.remove();
      grabbing(false);
    };
  }, []);

  // While a row is carried, the box it scrolls in scrolls at its top and bottom.
  const isDragging = !!carry && !carry.isSettling;
  useEffect(() => {
    const box = list.current;
    if (!isDragging || !box) return;
    const page = scrollParent(box);
    let frame = 0;
    const tick = () => {
      const { y } = pointer.current;
      const area = page === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : page.getBoundingClientRect();
      const dy = y < area.top + EDGE ? -speed(area.top + EDGE - y) : y > area.bottom - EDGE ? speed(y - area.bottom + EDGE) : 0;
      if (dy) {
        const before = page.scrollTop;
        page.scrollTop += dy;
        if (page.scrollTop !== before) onScrolled();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isDragging]);

  // A row that changed place slides there from where it was (from where it showed, when it was already sliding), and a
  // grip moved by the keys keeps its focus.
  useLayoutEffect(() => {
    const isStill = isReduced();
    const next = new Map<string, number>();
    for (const element of rowsIn()) {
      const id = element.dataset.row!;
      const top = element.offsetTop;
      next.set(id, top);
      const before = tops.current.get(id);
      if (before === undefined || before === top || isStill) continue;
      const running = slides.current.get(element);
      const shift = running ? new DOMMatrixReadOnly(getComputedStyle(element).transform).m42 : 0;
      running?.cancel();
      slides.current.set(element, element.animate([{ transform: `translateY(${before + shift - top}px)` }, { transform: 'none' }], { duration: SLIDE_MS, easing: EASE }));
    }
    tops.current = next;
    const id = keepsFocus.current;
    if (id) {
      keepsFocus.current = null;
      const grip = list.current?.querySelector<HTMLElement>(`[data-row="${id}"] [data-grip]`);
      if (grip && document.activeElement !== grip) grip.focus({ preventScroll: true });
      grip?.scrollIntoView({ block: 'nearest' });
    }
  });

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (event.button !== 0 || carried.current || press.current) return;
    // A mouse press on the grip starts no text selection; a finger's is the grip's alone (touch-action: none).
    if (event.pointerType === 'mouse') event.preventDefault();
    press.current = { id, pointerId: event.pointerId, isTouch: event.pointerType === 'touch', x: event.clientX, y: event.clientY };
  };

  const onKeyDown = (event: ReactKeyboardEvent, id: string) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    if (carried.current) return;
    const next = stepBy(live.current, id, event.key === 'ArrowUp' ? -1 : 1);
    const name = nameOf(id);
    if (next.join() === live.current.join()) { setSaid(`'${name}' ${noun.topic} 이미 ${event.key === 'ArrowUp' ? '맨 위' : '맨 아래'}입니다.`); return; }
    keepsFocus.current = id;
    setSaid(`'${name}' ${noun.object} ${next.indexOf(id) + 1}번째로 옮겼습니다.`);
    void commit(next);
  };

  // A finger resting on the grip would open the browser's menu; the grip keeps it for carrying.
  const onContextMenu = (event: ReactMouseEvent) => { if (press.current?.isTouch || carried.current) event.preventDefault(); };

  return {
    list,
    hint,
    said,
    /** The rows' ids as shown: while carried and until saved, the new order. */
    order,
    /** What a row's box takes: its id and whether it is the carried one's empty slot. */
    rowProps: (id: string) => ({ 'data-row': id, 'data-carried': carry?.id === id || undefined }),
    /** What a row's grip takes: the hands that carry it and what it says to a screen reader. */
    gripProps: (row: Row) => ({
      'data-grip': true,
      'aria-label': `${row.name} ${noun.word} 순서 바꾸기`,
      'aria-describedby': hint,
      title: '끌거나 Alt + ↑/↓로 순서를 바꿉니다',
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => onPointerDown(event, row.id),
      onKeyDown: (event: ReactKeyboardEvent) => onKeyDown(event, row.id),
      onContextMenu,
    }),
  };
}
