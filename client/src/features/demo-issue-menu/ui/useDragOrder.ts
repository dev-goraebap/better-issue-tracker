import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * A list put in order by its rows' handles: pressed and dragged (mouse, pen or finger), the row follows the pointer and
 * takes the place of the row it passes the middle of, the order changing as it goes (onChange); the arrow keys on a
 * focused handle move its row a place up or down. listRef goes on the list whose children are the rows.
 */
export function useDragOrder<T>(items: readonly T[], onChange: (next: T[]) => void) {
  const listRef = useRef<HTMLOListElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const moved = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    return next;
  };
  const handle = (index: number) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* The drag still follows moves over the handle. */ }
      setDragging(index);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (dragging === null || !listRef.current) return;
      const rows = [...listRef.current.children] as HTMLElement[];
      const over = rows.findIndex(row => { const box = row.getBoundingClientRect(); return event.clientY < box.top + box.height / 2; });
      const to = over === -1 ? rows.length - 1 : over > dragging ? over - 1 : over;
      if (to !== dragging) { onChange(moved(dragging, to)); setDragging(to); }
    },
    onPointerUp: () => setDragging(null),
    onPointerCancel: () => setDragging(null),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const by = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
      if (!by || index + by < 0 || index + by >= items.length) return;
      event.preventDefault();
      onChange(moved(index, index + by));
      // The handle keeps the focus as its row moves.
      requestAnimationFrame(() => (listRef.current?.children[index + by]?.querySelector('[data-handle]') as HTMLElement | null)?.focus());
    },
  });
  return { listRef, dragging, handle };
}
