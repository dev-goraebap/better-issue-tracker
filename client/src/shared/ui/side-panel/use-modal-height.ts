import { useLayoutEffect, type RefObject } from 'react';
import { measuredParts, modalHeight, MODAL_MIN_HEIGHT, naturalHeight } from './modal-height';

/** How long the modal is marked as resizing: the height transition (--duration-fast-max) and a little more. */
const RESIZE_MS = 280;

/**
 * Drives a content modal's height as an explicit pixel value so it can ease between sizes in every browser (a height of
 * auto does not transition): its content's natural height, kept between its size's minimum and 90% of the window. The
 * header, the footer and what the body holds are watched (ResizeObserver), and a page swapped inside (detail to editor)
 * or a resized window measures again once a frame. While it changes, the modal is marked data-resizing so the body
 * clips instead of showing a passing scrollbar.
 */
export function useModalHeight(dialog: RefObject<HTMLElement | null>, size: keyof typeof MODAL_MIN_HEIGHT, classes: { panel: string; body: string }) {
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let settle = 0;
    const apply = () => {
      frame = 0;
      const next = `${modalHeight(naturalHeight(element, classes), size, window.innerHeight)}px`;
      if (element.style.height === next) return;
      if (element.style.height && !still.matches) {
        element.dataset.resizing = '';
        clearTimeout(settle);
        settle = window.setTimeout(() => { delete element.dataset.resizing; }, RESIZE_MS);
      }
      element.style.height = next;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(apply); };
    const sizes = new ResizeObserver(schedule);
    const watch = () => { sizes.disconnect(); measuredParts(element, classes).forEach(part => sizes.observe(part)); };
    // The first height is set before paint, so the modal opens at its size; only later changes ease.
    apply();
    watch();
    const swaps = new MutationObserver(() => { watch(); schedule(); });
    swaps.observe(element, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      sizes.disconnect();
      swaps.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [dialog, size, classes]);
}
