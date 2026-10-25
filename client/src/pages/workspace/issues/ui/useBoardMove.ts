import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { WorkItem } from '@/entities/work-item';
import { placeOf, spotOf, stepSpot, withCardAt, type BoardSpot, type MoveLane, type MovePlace, type StepKey } from '../model/board-move';

/** A mouse or pen press that moves this many pixels picks the card up; less is a click. */
const MOUSE_THRESHOLD = 4;
/** A finger picks the card up by resting on it this long; moving further than the slop first is a scroll. */
const TOUCH_HOLD_MS = 350;
const TOUCH_SLOP = 8;
/** Near an edge of the board or the page, by this many pixels, the view scrolls toward it, faster closer in. */
const EDGE = 56;
const SPEED = 18;
const STEP_KEYS: readonly string[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] satisfies StepKey[];

export type BoardLane = MoveLane<WorkItem> & { name: string };
type Carry = { item: WorkItem; spot: BoardSpot; by: 'pointer' | 'keys' };
type Press = { item: WorkItem; pointerId: number; isTouch: boolean; x: number; y: number; card: HTMLElement; timer?: number };

const speed = (depth: number) => Math.ceil((Math.min(depth, EDGE) / EDGE) * SPEED);

/** The box that scrolls the board up and down: the nearest scrolling ancestor, else the page. */
function scrollParent(element: HTMLElement): HTMLElement {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return document.scrollingElement as HTMLElement;
}

/**
 * Carrying a board card to another lane or place, by every hand (bit-frontend 05): a mouse drags it, a finger rests on
 * it and then drags, and the keyboard picks it up with Space, walks it with the arrows and puts it down with Space or
 * Enter. While carried the card is shown where it would land, a copy of it follows the pointer and the board scrolls
 * at its edges; Escape puts it back. A drop is shown in place until it is saved (onMove), and every step is read out.
 */
export function useBoardMove<Lane extends BoardLane>(lanes: readonly Lane[], canMove: boolean, ghostClass: string, onMove: (item: WorkItem, place: MovePlace) => Promise<unknown>) {
  const board = useRef<HTMLDivElement>(null);
  const [carry, setCarry] = useState<Carry | null>(null);
  const [saving, setSaving] = useState<{ id: string; spot: BoardSpot } | null>(null);
  const [said, setSaid] = useState('');
  const hint = useId();
  const carried = useRef<Carry | null>(null);
  const press = useRef<Press | null>(null);
  const ghost = useRef<{ element: HTMLElement; dx: number; dy: number } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const isClickSwallowed = useRef(false);
  const keepsFocus = useRef<string | null>(null);

  const where = (spot: BoardSpot) => `${lanes.find(lane => lane.key === spot.lane)?.name ?? ''} ${spot.index + 1}번째`;
  const put = (next: Carry | null) => { carried.current = next; setCarry(next); };
  const release = () => { if (press.current?.timer) clearTimeout(press.current.timer); press.current = null; };
  const dropGhost = () => { ghost.current?.element.remove(); ghost.current = null; };
  const cancel = () => {
    dropGhost(); release();
    if (carried.current?.by === 'keys') keepsFocus.current = carried.current.item.id;
    if (carried.current) setSaid('옮기기를 취소했습니다.');
    put(null);
  };

  const drop = async () => {
    const done = carried.current;
    dropGhost(); release(); put(null);
    if (!done) return;
    const item = lanes.flatMap(lane => lane.cards).find(card => card.id === done.item.id) ?? done.item;
    const place = placeOf(lanes, item.id, done.spot);
    if (!place) { setSaid(`${item.key}을(를) 제자리에 두었습니다.`); return; }
    if (done.by === 'keys') keepsFocus.current = item.id;
    setSaving({ id: item.id, spot: done.spot });
    setSaid(`${item.key}을(를) ${where(done.spot)}에 놓았습니다.`);
    try { await onMove(item, place); } finally { setSaving(null); }
  };

  /** The lane nearest the point across, and the place among its other cards above the point. */
  const spotAt = (x: number, y: number): BoardSpot | null => {
    const laneBoxes = [...(board.current?.querySelectorAll<HTMLElement>('[data-lane]') ?? [])];
    if (!laneBoxes.length) return null;
    const across = (box: HTMLElement) => { const rect = box.getBoundingClientRect(); return x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0; };
    const lane = laneBoxes.reduce((nearest, box) => (across(box) < across(nearest) ? box : nearest));
    const others = [...lane.querySelectorAll<HTMLElement>('[data-card]')].filter(card => card.dataset.card !== carried.current?.item.id);
    const index = others.filter(card => { const rect = card.getBoundingClientRect(); return rect.top + rect.height / 2 < y; }).length;
    return { lane: lane.dataset.lane!, index };
  };

  const follow = (x: number, y: number) => {
    pointer.current = { x, y };
    if (ghost.current) ghost.current.element.style.transform = `translate(${x - ghost.current.dx}px, ${y - ghost.current.dy}px)`;
    const now = carried.current;
    const spot = spotAt(x, y);
    if (now && spot && (spot.lane !== now.spot.lane || spot.index !== now.spot.index)) put({ ...now, spot });
  };

  const lift = (at: Press) => {
    const spot = spotOf(lanes, at.item.id);
    if (!spot) return;
    const rect = at.card.getBoundingClientRect();
    const copy = at.card.cloneNode(true) as HTMLElement;
    copy.removeAttribute('href');
    copy.setAttribute('aria-hidden', 'true');
    copy.classList.add(ghostClass);
    copy.style.inlineSize = `${rect.width}px`;
    document.body.append(copy);
    ghost.current = { element: copy, dx: at.x - rect.left, dy: at.y - rect.top };
    if (at.isTouch) navigator.vibrate?.(8);
    put({ item: at.item, spot, by: 'pointer' });
    setSaid(`${at.item.key}을(를) 집었습니다.`);
    follow(at.x, at.y);
  };

  const onHeld = useEffectEvent((at: Press) => { if (press.current === at) lift(at); });
  const onPointerMove = useEffectEvent((event: PointerEvent) => {
    const at = press.current;
    if (!at || event.pointerId !== at.pointerId) return;
    if (carried.current?.by === 'pointer') { follow(event.clientX, event.clientY); return; }
    const moved = Math.hypot(event.clientX - at.x, event.clientY - at.y);
    if (at.isTouch) { if (moved > TOUCH_SLOP) release(); return; }
    if (moved >= MOUSE_THRESHOLD) { lift(at); follow(event.clientX, event.clientY); }
  });
  const onPointerUp = useEffectEvent((event: PointerEvent) => {
    if (press.current?.pointerId !== event.pointerId) return;
    if (carried.current?.by !== 'pointer') { release(); return; }
    isClickSwallowed.current = true;
    setTimeout(() => { isClickSwallowed.current = false; }, 0);
    void drop();
  });
  const onPointerCancel = useEffectEvent((event: PointerEvent) => {
    if (press.current?.pointerId !== event.pointerId) return;
    if (carried.current?.by === 'pointer') cancel(); else release();
  });
  const onEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape' || carried.current?.by !== 'pointer') return;
    event.preventDefault(); event.stopPropagation(); cancel();
  });
  const onScrolled = useEffectEvent(() => follow(pointer.current.x, pointer.current.y));

  useEffect(() => {
    // A carried card holds the finger: the page must not scroll under it (only a listener that is not passive may stop it).
    const holdTouch = (event: TouchEvent) => { if (carried.current?.by === 'pointer') event.preventDefault(); };
    // The click that ends a drag is not a click on the card.
    const swallow = (event: MouseEvent) => { if (isClickSwallowed.current) { event.preventDefault(); event.stopPropagation(); isClickSwallowed.current = false; } };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onEscape, true);
    window.addEventListener('touchmove', holdTouch, { passive: false });
    window.addEventListener('click', swallow, true);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onEscape, true);
      window.removeEventListener('touchmove', holdTouch);
      window.removeEventListener('click', swallow, true);
      ghost.current?.element.remove();
    };
  }, []);

  // While a pointer carries a card, the board scrolls sideways at its ends and the page at its top and bottom.
  const isDragging = carry?.by === 'pointer';
  useEffect(() => {
    const box = board.current;
    if (!isDragging || !box) return;
    const page = scrollParent(box);
    let frame = 0;
    const tick = () => {
      const { x, y } = pointer.current;
      const across = box.getBoundingClientRect();
      const down = page === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : page.getBoundingClientRect();
      const dx = x < across.left + EDGE ? -speed(across.left + EDGE - x) : x > across.right - EDGE ? speed(x - across.right + EDGE) : 0;
      const dy = y < down.top + EDGE ? -speed(down.top + EDGE - y) : y > down.bottom - EDGE ? speed(y - down.bottom + EDGE) : 0;
      if (dx) box.scrollLeft += dx;
      if (dy) page.scrollTop += dy;
      if (dx || dy) onScrolled();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isDragging]);

  // A card walked by the keys moves between lists, which takes its focus; it gets it back and stays in view.
  useLayoutEffect(() => {
    const id = carry?.by === 'keys' ? carry.item.id : keepsFocus.current;
    if (!id) return;
    const card = board.current?.querySelector<HTMLElement>(`[data-card="${id}"]`);
    if (card && (document.activeElement === card || document.activeElement === document.body || !document.activeElement)) {
      if (document.activeElement !== card) card.focus({ preventScroll: true });
      card.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    if (!carry && !saving) keepsFocus.current = null;
  });

  const onKeyDown = (event: ReactKeyboardEvent, item: WorkItem) => {
    const now = carried.current;
    if (!now) {
      if (event.key !== ' ' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      const spot = spotOf(lanes, item.id);
      if (!spot) return;
      put({ item, spot, by: 'keys' });
      setSaid(`${item.key}을(를) 집었습니다. ${where(spot)}. 화살표로 옮기고 스페이스나 Enter로 놓습니다. Esc는 취소입니다.`);
      return;
    }
    if (now.by !== 'keys' || now.item.id !== item.id) return;
    if (STEP_KEYS.includes(event.key)) {
      event.preventDefault();
      const spot = stepSpot(lanes, item.id, now.spot, event.key as StepKey);
      put({ ...now, spot });
      setSaid(where(spot));
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      void drop();
    } else if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); cancel();
    } else if (event.key === 'Tab') cancel();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, item: WorkItem) => {
    if (event.button !== 0 || carried.current || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    release();
    const at: Press = { item, pointerId: event.pointerId, isTouch: event.pointerType === 'touch', x: event.clientX, y: event.clientY, card: event.currentTarget };
    if (at.isTouch) at.timer = window.setTimeout(() => onHeld(at), TOUCH_HOLD_MS);
    press.current = at;
  };

  // A finger resting on a link opens the browser's link menu; on a card it picks the card up instead.
  const onContextMenu = (event: ReactMouseEvent) => { if (press.current?.isTouch || carried.current) event.preventDefault(); };

  // Focus leaving the card walked by the keys puts it back (its own move between lists gives the focus straight back).
  const onBlur = () => {
    if (carried.current?.by !== 'keys') return;
    setTimeout(() => {
      const now = carried.current;
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.card : undefined;
      if (now?.by === 'keys' && focused !== now.item.id) cancel();
    }, 0);
  };

  const at = carry ?? (saving && { item: { id: saving.id }, spot: saving.spot });
  return {
    board,
    hint,
    said,
    carry,
    /** The lanes as shown: the carried card where it would land, a saving one where it was put down. */
    shown: at ? withCardAt<WorkItem, Lane>(lanes, at.item.id, at.spot) : [...lanes],
    /** What a card's link takes: its id, how it is carried, and the hands that carry it. */
    cardProps: (item: WorkItem) => (canMove ? {
      'data-card': item.id,
      'data-movable': true,
      'data-carried': carry?.item.id === item.id ? carry.by : undefined,
      draggable: false,
      'aria-describedby': hint,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => onPointerDown(event, item),
      onKeyDown: (event: ReactKeyboardEvent) => onKeyDown(event, item),
      onContextMenu,
      onBlur,
    } : { 'data-card': item.id }),
  };
}
