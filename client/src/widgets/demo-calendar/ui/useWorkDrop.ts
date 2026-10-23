import { useState, type DragEvent } from 'react';
import { WORK_DRAG_TYPE } from '../model/events';

/** The day under the pointer: the nearest element there that names one (a day's cell, a week's column or head). */
const dayAt = (x: number, y: number) =>
  document.elementsFromPoint(x, y).map(element => (element as HTMLElement).dataset?.day).find(Boolean) ?? null;

/**
 * Work carried in from outside the calendar (the home's 날짜 미정 drawer) and dropped on a day: the props for the view's
 * root, and the day it would land on (marked as a drag within the calendar marks it). Without onDrop nothing is taken.
 */
export function useWorkDrop(onDrop?: (itemId: string, day: string) => void) {
  const [day, setDay] = useState<string | null>(null);
  const accepts = (event: DragEvent) => !!onDrop && event.dataTransfer.types.includes(WORK_DRAG_TYPE);
  const props = {
    onDragOver: (event: DragEvent) => {
      if (!accepts(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDay(dayAt(event.clientX, event.clientY));
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDay(null);
    },
    onDrop: (event: DragEvent) => {
      if (!accepts(event)) return;
      event.preventDefault();
      const id = event.dataTransfer.getData(WORK_DRAG_TYPE);
      const to = dayAt(event.clientX, event.clientY);
      setDay(null);
      if (id && to) onDrop!(id, to);
    },
  };
  return { day, props };
}
