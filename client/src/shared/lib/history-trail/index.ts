import { useNavigate, useRouter, type NavigateOptions, type RouterHistory } from '@tanstack/react-router';
import { useCallback, type MouseEvent } from 'react';

/**
 * Where the member has been in this tab and whether the latest move went back through that history (the browser's back
 * or forward, a swipe) rather than to somewhere new. Lists keep what they loaded only when returned to, and links back
 * to a list go back through history when the list is the screen just before. Entries are held in memory, so after a
 * reload nothing is known to be behind and every link simply navigates.
 */
const trail = new Map<number, string>();
let current = 0;
let returned = false;

export function followHistory(history: RouterHistory): () => void {
  const note = () => {
    current = history.location.state.__TSR_index;
    trail.set(current, history.location.href);
  };
  note();
  return history.subscribe(({ action }) => {
    returned = action.type === 'BACK' || action.type === 'FORWARD' || action.type === 'GO';
    note();
  });
}

/** Whether the screen being shown was reached by going back or forward through history. */
export const isReturning = () => returned;

/** Whether a screen of this app is known just before this one in this tab's history (not after a reload or a fresh tab). */
export const hasPrevious = () => trail.has(current - 1);

/** Whether the screen just before this one in history is exactly href (path and search). */
export const isJustBefore = (href: string) => trail.get(current - 1) === href;

/**
 * Goes to a screen, back through history when it is the one just before (so a list keeps the slices and the place the
 * member left), otherwise by navigating to it.
 */
export function useReturnTo() {
  const router = useRouter();
  const navigate = useNavigate();
  return useCallback((options: NavigateOptions) => {
    if (isJustBefore(router.buildLocation(options as Parameters<typeof router.buildLocation>[0]).href)) router.history.back();
    else void navigate(options);
  }, [router, navigate]);
}

/** Whether a click is a plain one, which a link may take over, rather than one opening a new tab or window. */
export const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
