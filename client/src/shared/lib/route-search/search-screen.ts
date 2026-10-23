import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';

/**
 * A phone's search screen over a list: the list's own address with finding=1, so it is a step in history that the
 * phone's back gesture and the screen's back arrow both leave, and a reload or a shared link opens it again. A list's
 * search parser keeps the value with findingOf.
 */
export const findingOf = (raw: Record<string, unknown>): 1 | undefined => (raw.finding === 1 || raw.finding === '1' ? 1 : undefined);

// Whether this tab opened the screen itself, so closing it steps back rather than leaving a step behind.
let isOpenedHere = false;

/** Whether the search screen is open, and the ways to open and close it. */
export function useSearchScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  // Read from the route's own search, so only a list whose parser keeps finding (findingOf) opens the screen; another page
  // ignores the value in its address.
  const isOpen = useRouterState({ select: state => (state.matches.at(-1)?.search as { finding?: unknown } | undefined)?.finding === 1 });
  // Left another way (the phone's back gesture), the screen is no longer this tab's to step back from.
  useEffect(() => { if (!isOpen) isOpenedHere = false; }, [isOpen]);
  // The address in view with finding set or taken away, its other values as they are.
  const hrefWith = useCallback((isFinding: boolean) => {
    const { pathname, searchStr } = router.state.location;
    const values = new URLSearchParams(searchStr);
    if (isFinding) values.set('finding', '1'); else values.delete('finding');
    const search = values.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [router]);
  const open = useCallback(() => { isOpenedHere = true; void navigate({ href: hrefWith(true) }); }, [navigate, hrefWith]);
  const close = useCallback(() => {
    if (isOpenedHere) { isOpenedHere = false; router.history.back(); return; }
    void navigate({ href: hrefWith(false), replace: true });
  }, [navigate, router, hrefWith]);
  return { isOpen, open, close };
}
