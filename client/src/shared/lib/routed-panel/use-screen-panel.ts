import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { closeMove, isOpenedDirectly, markedDepth, PANEL_MARK, panelDepth, pathOf, searchOf, type PanelHost, type PanelPlace } from './index';

/**
 * A screen that holds a panel (the team calendar, the work item list): the host its pages open in, kept in the screen's own
 * address as panel and depth while the address bar shows the page's own (a masked move). to is the screen's path and
 * under its own search without the panel, so closing returns to exactly that place.
 *
 * Every page the panel shows is a history entry of its own, marked in the history's state with the panel's depth;
 * closing goes back past exactly those, never out of the app, or puts the screen in place when it pushed none. An
 * address naming a panel on an entry without the mark counts as opened directly, whatever depth it says. (SandboxHr asks about unsaved work first; BIT's panels hold none
 * yet, so they close at once.) A panel opened directly by its address gets its screen put under it; on a phone
 * there is no panel, so a page opens on its own and a panel's address becomes its page.
 */
export function useScreenPanel(to: string, place: PanelPlace, under: Record<string, unknown>) {
  const navigate = useNavigate();
  const router = useRouter();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const depth = panelDepth(place);
  const underKey = JSON.stringify(under);
  // The panel as this history entry really holds it: its depth only when the entry is one the panel pushed.
  const held = (): PanelPlace => ({ panel: place.panel, depth: place.panel ? markedDepth(router.history.location.state) : undefined });
  const openOn = (href: string, replace = false) => {
    const pushed = panelDepth(held());
    const next = replace ? Math.max(pushed, 1) : pushed + 1;
    void navigate({
      to, search: { ...under, panel: href, depth: next }, replace, state: { [PANEL_MARK]: next },
      mask: { to: pathOf(href), search: searchOf(href), state: { [PANEL_MARK]: next } },
    } as never);
  };
  const host: PanelHost = useMemo(() => ({
    open: (href, replace = false) => (isMobile ? void navigate({ href, replace }) : openOn(href, replace)),
    close: () => {
      const move = closeMove(held());
      if (move.kind === 'back') router.history.go(-move.steps);
      else void navigate({ to, search: under, replace: true } as never);
    },
    back: () => { if (panelDepth(held()) > 0) router.history.back(); },
    // The page takes the entry of the panel's first page, the ones after it dropped, so back from it is the screen.
    expand: href => {
      const steps = panelDepth(held());
      if (steps <= 1) { void navigate({ href, replace: true }); return; }
      const stop = router.history.subscribe(() => { stop(); void navigate({ href, replace: true }); });
      router.history.go(-(steps - 1));
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [to, underKey, place.panel, depth, isMobile]);
  useEffect(() => {
    if (isMobile || !isOpenedDirectly(held())) return;
    const href = place.panel!;
    void navigate({ to, search: under, replace: true } as never).then(() => {
      // Pushed once even when the effect runs twice: the second finds the panel already over the screen.
      if ((router.state.location.search as PanelPlace).panel) return;
      openOn(href);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.panel, place.depth, isMobile]);
  useEffect(() => {
    if (isMobile && place.panel) void navigate({ href: place.panel, replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, place.panel]);
  return { host, openOn, depth, isMobile };
}
