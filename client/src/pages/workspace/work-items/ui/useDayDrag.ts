import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { WorkItem } from '@/entities/work-item';
import { daysBetween } from '../model/dates';

/** A press that moves less than this many pixels is a click, not a drag. */
const DRAG_THRESHOLD = 4;

/** A work item being carried across the month: the day it was picked up on and the day under the pointer now. */
export type DayDrag = { item: WorkItem; from: string; to: string };

type Press = { item: WorkItem; from: string; x: number; y: number };

/** The day cell under a point, by its data-day. */
const dayAt = (x: number, y: number) =>
  document.elementsFromPoint(x, y).map(element => (element as HTMLElement).dataset?.day).find(Boolean) ?? null;

/**
 * Carrying a work item's bar to other days of the month, as SandboxHr's calendar carries an event. It is picked up on the
 * day it was pressed, so a bar over several days moves by as many days as the pointer does, keeping its length. Escape
 * drops it.
 */
export function useDayDrag(onMove: (item: WorkItem, days: number) => void) {
  const [drag, setDrag] = useState<DayDrag | null>(null);
  const press = useRef<Press | null>(null);
  const current = useRef<DayDrag | null>(null);
  const dragged = useRef(false);
  const moved = useEffectEvent(onMove);

  useEffect(() => {
    const end = () => { press.current = null; current.current = null; setDrag(null); };
    const move = (pointer: PointerEvent) => {
      const at = press.current;
      if (!at) return;
      if (!current.current && Math.hypot(pointer.clientX - at.x, pointer.clientY - at.y) < DRAG_THRESHOLD) return;
      const next = { item: at.item, from: at.from, to: dayAt(pointer.clientX, pointer.clientY) ?? current.current?.to ?? at.from };
      current.current = next;
      setDrag(next);
    };
    const up = () => {
      const done = current.current;
      if (done) {
        dragged.current = true;
        setTimeout(() => { dragged.current = false; }, 0);
        const days = daysBetween(done.from, done.to);
        if (days !== 0) moved(done.item, days);
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
    press: (pointer: ReactPointerEvent, item: WorkItem) => {
      if (pointer.button !== 0 || pointer.pointerType === 'touch') return;
      const from = dayAt(pointer.clientX, pointer.clientY);
      if (!from) return;
      pointer.preventDefault();
      press.current = { item, from, x: pointer.clientX, y: pointer.clientY };
    },
  };
}
