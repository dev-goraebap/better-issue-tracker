import { useEffect, useRef, type RefObject } from 'react';

/**
 * Closes a combobox's popup on a press anywhere but the box and the popup itself. The browser's own light dismiss
 * cannot do this: it closes on the press that lands in the box, so a box that opens as it takes focus showed its popup
 * and lost it in the same click.
 */
export function useOutsidePress(isOpen: boolean, parts: RefObject<HTMLElement | null>[], close: () => void) {
  const latest = useRef({ parts, close });
  latest.current = { parts, close };
  useEffect(() => {
    if (!isOpen) return;
    const press = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!latest.current.parts.some(part => part.current?.contains(target))) latest.current.close();
    };
    document.addEventListener('pointerdown', press, true);
    return () => document.removeEventListener('pointerdown', press, true);
  }, [isOpen]);
}
