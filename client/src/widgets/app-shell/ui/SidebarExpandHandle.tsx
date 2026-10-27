import { useRef } from 'react';
import styles from './app-shell.module.css';

/** Keeps the collapsed sidebar boundary operable while Astryx hides its resize handle. */
export function SidebarExpandHandle({ onExpand }: { onExpand: () => void }) {
  const start = useRef<number | null>(null);
  return <button type="button" className={styles.expandHandle} aria-label="사이드바 펼치기" title="클릭하거나 오른쪽으로 끌어 펼치기"
    onClick={onExpand}
    onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); onExpand(); } }}
    onPointerDown={event => {
      if (event.button !== 0) return;
      start.current = event.clientX;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (start.current !== null && event.clientX - start.current > 12) { start.current = null; onExpand(); }
    }}
    onPointerUp={() => { start.current = null; }} onPointerCancel={() => { start.current = null; }} />;
}
