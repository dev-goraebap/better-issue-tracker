/**
 * Back — the browser's button, Android's back button, iOS's edge swipe — closes the overlay on top (a dialog, a dialog
 * shown as a full page on a phone, a bottom sheet, a drawer) instead of leaving the screen under it.
 *
 * Every open overlay is a native `<dialog open>` (Astryx Dialog, BottomSheet, MobileNav), so one watcher covers them
 * all. Each one opened joins one last-in-first-out stack and adds one history entry of its own, the current
 * address with a marker. Back pops that entry: the newest overlay alone gets the browser's close request (`cancel`),
 * the way Escape closes it, and a sheet opened inside a dialog closes before the dialog. An overlay closed another way
 * (its button, the backdrop) takes its entry back with `history.back()`, whose `popstate` is swallowed.
 *
 * The router never sees these entries: they are written with the browser's own pushState, which TanStack Router does
 * not watch, and their `popstate` is stopped before the router's listener, so a list keeps the slices it has read and a
 * form's unsaved-work guard does not take it for leaving. The browser calls a window's popstate listeners in the order
 * they were added, so this is installed before the router builds its history (app/back-close.ts). An overlay that goes away because a link inside it moved to another screen leaves its entry
 * under the new one; the marker carries the old screen's router state, so going back there is an ordinary back.
 *
 * A panel showing pages with their own addresses, and the question asked before leaving unsaved work (both marked
 * data-router-history), are left out: each page in the panel is already a history entry of the router's, so back steps
 * through them and closes the panel without help, and the question answers a move the router is holding.
 */

type Entry = { dialog: HTMLDialogElement; closedByBack: boolean };

const MARK = '__sheet';
const stack: Entry[] = [];
let swallow = 0;
const settled: (() => void)[] = [];
let installed = false;

const isMarked = (state: unknown) => !!(state && typeof state === 'object' && (state as Record<string, unknown>)[MARK]);

function push(dialog: HTMLDialogElement) {
  stack.push({ dialog, closedByBack: false });
  // The browser's own pushState, which the router has not wrapped, keeps the entry out of the router's sight.
  History.prototype.pushState.call(window.history, { ...(window.history.state ?? {}), [MARK]: true }, '');
}

function closed(dialog: HTMLDialogElement) {
  const index = stack.findIndex(entry => entry.dialog === dialog);
  if (index === -1) return;
  const [entry] = stack.splice(index, 1);
  if (entry!.closedByBack) return;
  // Closed by its own button: take back its entry, unless a move from inside it has already stacked another on top.
  if (isMarked(window.history.state)) {
    swallow += 1;
    window.history.back();
  }
}

function onPopState(event: PopStateEvent) {
  if (swallow > 0) {
    swallow -= 1;
    event.stopImmediatePropagation();
    if (swallow === 0) settled.splice(0).forEach(run => run());
    return;
  }
  const top = stack.pop();
  if (!top) return;
  event.stopImmediatePropagation();
  top.closedByBack = true;
  // Its entry is spent either way; an overlay that stays open (asking about unsaved work) is left to its own buttons.
  top.dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
}

/**
 * Runs after an overlay closed just now has taken its history entry back. A screen that changes its address as an
 * overlay closes (dropping a search value the overlay was opened from) waits for this, or the change lands on the
 * overlay's entry and the address before it keeps the old value for the back button.
 */
export function afterOverlayClose(run: () => void) {
  // A turn later the overlay has left the page and its entry is being taken back, if it had one.
  setTimeout(() => {
    if (swallow > 0) settled.push(run);
    else run();
  }, 0);
}

/** Starts watching once for the whole app, on every screen size. */
export function installBackClose() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const tracked = new Set<HTMLDialogElement>();
  const scan = () => {
    for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) {
      // A panel whose pages have their own addresses, and the question asked before leaving one, move by the router's
      // own history entries.
      if (tracked.has(dialog) || dialog.matches('[data-router-history]') || dialog.querySelector('[data-router-history]')) continue;
      tracked.add(dialog);
      push(dialog);
    }
    for (const dialog of [...tracked]) {
      if (dialog.isConnected && dialog.open) continue;
      tracked.delete(dialog);
      closed(dialog);
    }
  };
  new MutationObserver(scan).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
  // Added before the router's own popstate listener (see the top), so it is called first.
  window.addEventListener('popstate', onPopState, { capture: true });
}
