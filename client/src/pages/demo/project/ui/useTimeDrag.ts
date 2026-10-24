import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { DRAG_THRESHOLD, movedWithin, stretched } from '../model/drag';
import type { DemoEvent } from '../model/events';

/** What a drag over the week's hours is doing now: moving an event, or stretching it by its lower edge. */
export type TimeDrag = { mode: 'move' | 'resize'; event: DemoEvent; column: number; start: number; end: number };

type Press = { mode: TimeDrag['mode']; event: DemoEvent; column: number; start: number; end: number; x: number; y: number };

/**
 * Dragging over the hours of a week, as SandboxHr's (without marking out free time for a new event): an event's body
 * moves it to another time or day and its lower edge stretches it, by quarter hours. A press that hardly moves stays a
 * click. Escape drops the drag; letting go hands the result on.
 */
export function useTimeDrag({ hour, columnAt, onMove }: {
  hour: number; columnAt: (x: number) => number | null;
  onMove: (event: DemoEvent, column: number, start: number, end: number) => void;
}) {
  const [drag, setDrag] = useState<TimeDrag | null>(null);
  const press = useRef<Press | null>(null);
  const current = useRef<TimeDrag | null>(null);
  const dragged = useRef(false);
  const handlers = useRef({ columnAt, onMove });
  handlers.current = { columnAt, onMove };

  useEffect(() => {
    const end = () => { press.current = null; current.current = null; setDrag(null); };
    const move = (pointer: PointerEvent) => {
      const at = press.current;
      if (!at) return;
      if (!current.current && Math.hypot(pointer.clientX - at.x, pointer.clientY - at.y) < DRAG_THRESHOLD) return;
      const by = ((pointer.clientY - at.y) / hour) * 60;
      const next: TimeDrag = at.mode === 'move'
        ? { mode: 'move', event: at.event, column: handlers.current.columnAt(pointer.clientX) ?? at.column, ...movedWithin(at.start, at.end, by) }
        : { mode: 'resize', event: at.event, column: at.column, start: at.start, end: stretched(at.start, at.end, by) };
      current.current = next;
      setDrag(next);
    };
    const up = () => {
      const done = current.current;
      if (done) {
        // The click that follows letting go belongs to the drag, not to the event under it.
        dragged.current = true;
        setTimeout(() => { dragged.current = false; }, 0);
        handlers.current.onMove(done.event, done.column, done.start, done.end);
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
  }, [hour]);

  return {
    drag,
    /** Whether a drag just ended, so the click it leaves behind is ignored. */
    wasDragged: () => dragged.current,
    pressEvent: (pointer: ReactPointerEvent, event: DemoEvent, column: number, start: number, end: number, mode: TimeDrag['mode']) => {
      if (pointer.button !== 0 || pointer.pointerType === 'touch') return;
      // Keeps the browser from selecting text while dragging; the click still follows.
      pointer.preventDefault();
      press.current = { mode, event, column, start, end, x: pointer.clientX, y: pointer.clientY };
    },
  };
}
