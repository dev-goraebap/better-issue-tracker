import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { closeMove, isOpenedDirectly, panelDepth, pathOf, searchOf, type PanelHost, type PanelPlace } from './index';

/**
 * A screen that holds a panel (the team calendar, the issue list): the host its pages open in, kept in the screen's own
 * address as panel and depth while the address bar shows the page's own (a masked move). to is the screen's path and
 * under its own search without the panel, so closing returns to exactly that place.
 *
 * Every page the panel shows is a history entry of its own; closing goes back past exactly those, never out of the app,
 * or puts the screen in place when it pushed none. (SandboxHr asks about unsaved work first; BIT's panels hold none
 * yet, so they close at once.) A panel opened directly by its address gets its screen put under it; on a phone
 * there is no panel, so a page opens on its own and a panel's address becomes its page.
 */
export function useScreenPanel(to: string, place: PanelPlace, under: Record<string, unknown>) {
  const navigate = useNavigate();
  const router = useRouter();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const depth = panelDepth(place);
  const underKey = JSON.stringify(under);
  const openOn = (href: string, replace = false) => void navigate({
    to, search: { ...under, panel: href, depth: replace ? Math.max(depth, 1) : depth + 1 }, replace,
    mask: { to: pathOf(href), search: searchOf(href) },
  } as never);
  const host: PanelHost = useMemo(() => ({
    open: (href, replace = false) => (isMobile ? void navigate({ href, replace }) : openOn(href, replace)),
    close: () => {
      const move = closeMove(place);
      if (move.kind === 'back') router.history.go(-move.steps);
      else void navigate({ to, search: under, replace: true } as never);
    },
    back: () => { if (depth > 0) router.history.back(); },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [to, underKey, place.panel, depth, isMobile]);
  useEffect(() => {
    if (isMobile || !isOpenedDirectly(place)) return;
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
