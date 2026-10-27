import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * Whether a box is one a page scrolls up and down in. A box that scrolls only sideways (a wide table's) also computes
 * an overflowY of auto, since the axes cannot differ; it clips nothing vertically, so the chain goes on through it.
 */
function scrolls(box: HTMLElement) {
  const style = getComputedStyle(box);
  return /(auto|scroll)/.test(style.overflowY) && !/(auto|scroll)/.test(style.overflowX);
}

/** Ancestors through the page's scrolling box, or through the document for standalone pages. */
function chainOf(element: HTMLElement): HTMLElement[] {
  const chain: HTMLElement[] = [];
  for (let box = element.parentElement; box; box = box.parentElement) {
    chain.push(box);
    if (scrolls(box)) return chain;
  }
  return chain;
}

/** A box's laid-out children (not positioned out of the flow, not hidden), in order. */
const laidOut = (box: HTMLElement) => [...box.children].filter((child): child is HTMLElement => child instanceof HTMLElement
  && !['SCRIPT', 'STYLE', 'HEAD'].includes(child.tagName)
  && getComputedStyle(child).display !== 'none'
  && !['absolute', 'fixed'].includes(getComputedStyle(child).position)
  && (child.getClientRects().length > 0 || getComputedStyle(child).display === 'contents'));

/**
 * The height a box leaves empty under its last laid-out child when that child is `inner` (the branch the stretched box
 * is in); undefined when other content follows that branch, as the room below is that content's to keep.
 */
function spareIn(box: HTMLElement, inner: HTMLElement): number | undefined {
  const last = laidOut(box).at(-1);
  if (last !== inner) return undefined;
  const style = getComputedStyle(box);
  const end = box.getBoundingClientRect().bottom - parseFloat(style.paddingBlockEnd) - parseFloat(style.borderBottomWidth);
  return Math.max(0, end - last.getBoundingClientRect().bottom - parseFloat(getComputedStyle(last).marginBlockEnd));
}

/**
 * Stretches a box over the height the page leaves empty below it, whatever boxes the page wraps it in: going up to the
 * box the page scrolls in, it adds what each box leaves empty under it, so the page ends where the card does and never
 * scrolls for it. Content that follows it (a second table on the page) keeps its place: the box stretches only as the
 * last thing on the page. Measured before paint and again whenever any of those boxes changes size; off (no minimum)
 * while isOn is false.
 */
export function useFillRoom<T extends HTMLElement>(isOn: boolean): RefObject<T | null> {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    const chain = element && isOn ? chainOf(element) : [];
    if (!element || chain.length === 0) return undefined;
    // Measured from the box's own height each time, so a window grown lower gives the room back.
    const fit = () => {
      element.style.minBlockSize = '';
      // Going up from the box, each box's room under it, until a box has something after it.
      let spare = 0;
      let inner: HTMLElement = element;
      let hasFollowingContent = false;
      for (const box of chain) {
        const room = spareIn(box, inner);
        if (room === undefined) { hasFollowingContent = true; break; }
        spare += room;
        inner = box;
      }
      if (!hasFollowingContent && !chain.some(scrolls)) {
        const bottomInset = chain.reduce((total, box) => {
          const style = getComputedStyle(box);
          return total + parseFloat(style.paddingBlockEnd) + parseFloat(style.borderBottomWidth) + parseFloat(style.marginBlockEnd);
        }, parseFloat(getComputedStyle(element).marginBlockEnd));
        spare = Math.max(0, window.innerHeight - element.getBoundingClientRect().bottom - bottomInset);
      }
      // Rounded down from the box's exact height: a rounded-up pixel (offsetHeight rounds) would make the page scroll by one.
      if (spare >= 1) element.style.minBlockSize = `${Math.floor(element.getBoundingClientRect().height + spare)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    for (const box of chain) observer.observe(box);
    window.addEventListener('resize', fit);
    return () => { observer.disconnect(); window.removeEventListener('resize', fit); element.style.minBlockSize = ''; };
  }, [isOn]);
  return ref;
}
