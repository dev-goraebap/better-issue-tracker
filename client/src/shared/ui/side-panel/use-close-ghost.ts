import { useLayoutEffect, type RefObject } from 'react';

/** The closing fade and scale: --duration-fast. */
const CLOSE_MS = 175;

/**
 * Lets a modal fade out though its owner removes it at once: as it leaves, a still copy of it over a copy of its
 * backdrop (inert, hidden from assistive technology) is left in its place for the closing animation, then removed. A
 * copy made by React's development double run, which is mounted again at once, is taken away before it is painted.
 * With reduced motion nothing is copied.
 */
export function useCloseGhost(dialog: RefObject<HTMLDialogElement | null>, classes: { backdrop: string; place: string; closing: string }) {
  useLayoutEffect(() => {
    document.querySelectorAll('[data-modal-ghost="pending"]').forEach(ghost => ghost.remove());
    const element = dialog.current;
    if (!element) return;
    return () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const backdrop = document.createElement('div');
      backdrop.className = `${classes.backdrop} ${classes.closing}`;
      const place = document.createElement('div');
      place.className = `${classes.place} ${classes.closing}`;
      const copy = element.cloneNode(true) as HTMLDialogElement;
      copy.setAttribute('open', '');
      place.append(copy);
      const ghosts = [backdrop, place];
      for (const ghost of ghosts) {
        ghost.setAttribute('inert', '');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.dataset.modalGhost = 'pending';
        document.body.append(ghost);
      }
      // Past this frame it is a real close: the copies play out and go.
      requestAnimationFrame(() => ghosts.forEach(ghost => { if (ghost.isConnected) ghost.dataset.modalGhost = 'closing'; }));
      window.setTimeout(() => ghosts.forEach(ghost => ghost.remove()), CLOSE_MS + 40);
    };
  }, [dialog, classes.backdrop, classes.place, classes.closing]);
}
