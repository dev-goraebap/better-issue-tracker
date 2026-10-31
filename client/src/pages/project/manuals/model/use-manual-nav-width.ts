import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

const KEY = 'bit.manual.navigation-width';
export const clampNavigationWidth = (width: number, room: number) => Math.max(200, Math.min(Number.isFinite(width) ? width : 232, Math.max(200, Math.min(360, room))));

export function useManualNavWidth() {
  const root = useRef<HTMLDivElement>(null);
  const [preferred, setPreferred] = useState(() => { try { return Number(localStorage.getItem(KEY) ?? 232); } catch { return 232; } });
  const [room, setRoom] = useState(360); const maximum = Math.max(200, Math.min(360, room));
  const width = clampNavigationWidth(preferred, room);
  const drag = useRef<{ x: number; width: number } | null>(null);
  useEffect(() => {
    const element = root.current; if (!element) return;
    const observer = new ResizeObserver(() => setRoom(element.clientWidth - 520)); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, String(preferred)); } catch { /* Resizing still works for this visit. */ } }, [preferred]);
  const setWidth = (next: number) => setPreferred(clampNavigationWidth(next, room));
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus();
    drag.current = { x: event.clientX, width }; event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current && event.currentTarget.hasPointerCapture(event.pointerId)) setWidth(drag.current.width + event.clientX - drag.current.x);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault();
    setWidth(event.key === 'Home' ? 200 : event.key === 'End' ? maximum : width + (event.key === 'ArrowLeft' ? -16 : 16));
  };
  return { root, width, maximum, setWidth, handle: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onLostPointerCapture: () => { drag.current = null; }, onKeyDown, onDoubleClick: () => setWidth(232) } };
}
