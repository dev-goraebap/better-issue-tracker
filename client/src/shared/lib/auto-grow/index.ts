import { useLayoutEffect, useRef } from 'react';

/**
 * A text box as tall as its words: it starts at the rows it was given and grows with each line, so what was written is
 * read whole instead of scrolled inside a small box. Past `maxPx` it stops and scrolls. Returns the ref for the box.
 */
export function useAutoGrow(value: string, maxPx = 384) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    box.style.blockSize = 'auto';
    const style = getComputedStyle(box);
    const border = style.boxSizing === 'border-box' ? parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth) : 0;
    const height = box.scrollHeight + border;
    box.style.blockSize = `${Math.min(height, maxPx)}px`;
    box.style.overflowY = height > maxPx ? 'auto' : 'hidden';
  }, [value, maxPx]);
  return ref;
}
