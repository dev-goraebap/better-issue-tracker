import { useEffect, useRef, useState } from 'react';

/** The longest a loader waits for the page to settle once its wait is over, so a busy page never keeps it for good. */
const SETTLE_CAP_MS = 1000;
/** How long a loader stays once the next screen is drawn, so the change settles before the veil starts to lift. */
const LINGER_MS = 200;

/**
 * Calls `done` once the screen that ended a wait is drawn: after a frame, at an idle moment with no long task since the
 * last look. Drawing a new screen runs as one or two long tasks, and a loader lifted in between froze halfway. Gives up
 * waiting after `cap` ms (`SETTLE_CAP_MS`).
 *
 * A page in a hidden tab draws no frames, so there is nothing to wait for and a frame would never come: there `done`
 * comes at once, and a page hidden while it waits is let go by a plain timer at the cap, so the loader never stays up
 * until the tab is shown. Returns a cancel.
 */
export function whenDrawn(done: () => void, cap = SETTLE_CAP_MS): () => void {
  const start = performance.now();
  let busy = false; let over = false;
  let frame = 0; let idle = 0; let timer: ReturnType<typeof setTimeout> | undefined;
  const watch = typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')
    ? new PerformanceObserver(() => { busy = true; }) : undefined;
  const stop = () => {
    over = true; watch?.disconnect(); clearTimeout(guard); clearTimeout(timer);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    if (idle && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
  };
  const finish = () => { if (over) return; stop(); done(); };
  // Frames stop while the page is hidden, and timers keep running (if slowed), so this lets the loader go whatever.
  const guard = setTimeout(finish, cap);
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    timer = setTimeout(finish, 0);
    return stop;
  }
  watch?.observe({ type: 'longtask' });
  const quiet = (then: () => void) => typeof requestIdleCallback === 'function'
    ? (idle = requestIdleCallback(then, { timeout: 200 })) : (timer = setTimeout(then, 50));
  const look = () => {
    frame = requestAnimationFrame(() => quiet(() => {
      if (over) return;
      if (busy && performance.now() - start < cap) { busy = false; look(); return; }
      finish();
    }));
  };
  look();
  return stop;
}

/**
 * Turns a raw loading flag into a loader flag that neither flashes nor blinks: the loader appears only after `delay` ms
 * of loading, and once shown it stays for at least `minimum` ms. It also stays until the screen that ends the wait is
 * drawn, and `LINGER_MS` past that, so the heavy frames of laying it out fall under the loader instead of on its fade.
 * With `isShownAtFirst`, a wait already under way at mount is taken as shown long enough: a loader that takes over from
 * one already on screen shows at once and has no minimum left to serve.
 */
export function useLoadingHold(isLoading: boolean, { delay = 200, minimum = 300, isShownAtFirst = false } = {}) {
  const [showing, setShowing] = useState(() => isShownAtFirst && isLoading);
  const shownAt = useRef<number | null>(isShownAtFirst && isLoading ? 0 : null);
  useEffect(() => {
    if (isLoading) {
      if (showing) return;
      const timer = window.setTimeout(() => { shownAt.current = Date.now(); setShowing(true); }, delay);
      return () => window.clearTimeout(timer);
    }
    if (!showing) return;
    let cancel = () => {};
    const remaining = Math.max(0, minimum - (Date.now() - (shownAt.current ?? 0)));
    const timer = window.setTimeout(() => {
      cancel = whenDrawn(() => {
        const linger = window.setTimeout(() => { shownAt.current = null; setShowing(false); }, LINGER_MS);
        cancel = () => window.clearTimeout(linger);
      });
    }, remaining);
    return () => { window.clearTimeout(timer); cancel(); };
  }, [isLoading, showing, delay, minimum]);
  return showing;
}
