/** The least a content modal is tall even when it holds little, by its size; never more than the window allows. */
export const MODAL_MIN_HEIGHT = { content: 560, compact: 440, form: 0 } as const;
/** The most a content modal is tall, as a share of the window's height (90dvh). */
const MAX_SHARE = 0.9;

/** The height to give a modal whose content would be natural pixels tall: at least its size's minimum, at most 90% of the window. */
export function modalHeight(natural: number, size: keyof typeof MODAL_MIN_HEIGHT, viewport: number) {
  const max = Math.floor(viewport * MAX_SHARE);
  const min = Math.min(MODAL_MIN_HEIGHT[size], max);
  return Math.ceil(Math.min(Math.max(natural, min), max));
}

/** A laid-out box as the height measure needs it: its edges and its outer margins. */
export type Box = { top: number; bottom: number; marginTop: number; marginBottom: number };

/** How tall a run of boxes stands from the top of the first to the bottom of the last, margins included. */
export function stackHeight(boxes: readonly Box[]) {
  if (!boxes.length) return 0;
  const top = Math.min(...boxes.map(box => box.top - box.marginTop));
  const bottom = Math.max(...boxes.map(box => box.bottom + box.marginBottom));
  return Math.max(0, bottom - top);
}

/** The shown children of an element as boxes; hidden ones (display: none, such as markers) take no room. */
export function boxesOf(element: Element): Box[] {
  return Array.from(element.children).filter(child => child.getClientRects().length > 0).map(child => {
    const rect = child.getBoundingClientRect();
    const style = getComputedStyle(child);
    return { top: rect.top, bottom: rect.bottom, marginTop: parseFloat(style.marginTop) || 0, marginBottom: parseFloat(style.marginBottom) || 0 };
  });
}

const paddingOf = (element: Element) => {
  const style = getComputedStyle(element);
  return (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
};

/**
 * How tall a modal's content would be if nothing bounded it, whatever height the modal has now: its frame's header and
 * footer as they are, and its body by what the body holds (the body itself stretches or scrolls with the modal, so its
 * own height says nothing). Content without a frame (a loader) counts by what it holds.
 */
export function naturalHeight(modal: HTMLElement, classes: { panel: string; body: string }) {
  const border = modal.offsetHeight - modal.clientHeight;
  const panel = modal.querySelector<HTMLElement>(`.${classes.panel}`);
  if (!panel) return border + paddingOf(modal) + stackHeight(boxesOf(modal));
  let height = 0;
  for (const part of Array.from(panel.children)) {
    if (!part.getClientRects().length) continue;
    height += part.classList.contains(classes.body) ? paddingOf(part) + stackHeight(boxesOf(part)) : (part as HTMLElement).offsetHeight;
  }
  return border + height;
}

/** The elements whose size changes the natural height: the frame's header and footer and what the body holds. */
export function measuredParts(modal: HTMLElement, classes: { panel: string; body: string }): Element[] {
  const panel = modal.querySelector<HTMLElement>(`.${classes.panel}`);
  if (!panel) return Array.from(modal.children);
  return Array.from(panel.children).flatMap(part => part.classList.contains(classes.body) ? Array.from(part.children) : [part]);
}
