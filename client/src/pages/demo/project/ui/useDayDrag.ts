import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { DRAG_THRESHOLD } from '../model/drag';
import type { DemoEvent } from '../model/events';

/** An event being carried across the month: the day it was picked up on and the day under the pointer now. */
export type DayDrag = { event: DemoEvent; from: string; to: string };

type Press = { event: DemoEvent; from: string; x: number; y: number };

/** The day cell under a point, by its data-day. */
const dayAt = (x: number, y: number) =>
  document.elementsFromPoint(x, y).map(element => (element as HTMLElement).dataset?.day).find(Boolean) ?? null;

/**
 * Carrying an event to another day of the month by its label or bar, keeping its times. It is picked up on the day it
 * was pressed, so a bar over several days moves by as many days as the pointer does. Escape drops it.
 */
export function useDayDrag(onMove: (event: DemoEvent, days: number) => void) {
  const [drag, setDrag] = useState<DayDrag | null>(null);
  const press = useRef<Press | null>(null);
  const current = useRef<DayDrag | null>(null);
  const dragged = useRef(false);
  const handler = useRef(onMove);
  handler.current = onMove;

  useEffect(() => {
    const end = () => { press.current = null; current.current = null; setDrag(null); };
    const move = (pointer: PointerEvent) => {
      const at = press.current;
      if (!at) return;
      if (!current.current && Math.hypot(pointer.clientX - at.x, pointer.clientY - at.y) < DRAG_THRESHOLD) return;
      const next = { event: at.event, from: at.from, to: dayAt(pointer.clientX, pointer.clientY) ?? current.current?.to ?? at.from };
      current.current = next;
      setDrag(next);
    };
    const up = () => {
      const done = current.current;
      if (done) {
        dragged.current = true;
        setTimeout(() => { dragged.current = false; }, 0);
        const days = Math.round((Date.parse(done.to) - Date.parse(done.from)) / 86_400_000);
        if (days !== 0) handler.current(done.event, days);
      }
      end();
    };
    const key = (keyboard: KeyboardEvent) => { if (keyboard.key === 'Escape' && press.current) { keyboard.preventDefault(); end(); } };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', end);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('keydown', key, true);
    };
  }, []);

  return {
    drag,
    wasDragged: () => dragged.current,
    press: (pointer: ReactPointerEvent, event: DemoEvent) => {
      if (pointer.button !== 0 || pointer.pointerType === 'touch') return;
      const from = dayAt(pointer.clientX, pointer.clientY);
      if (!from) return;
      pointer.preventDefault();
      press.current = { event, from, x: pointer.clientX, y: pointer.clientY };
    },
  };
}
