import { useRouter } from '@tanstack/react-router';
import { createContext, useContext } from 'react';

/**
 * The pages that may open in a panel: asked for from a screen that holds one, a page opens in the panel and the screen
 * stays under it, the address showing the page's own; refreshed or opened from anywhere else, the same address is the
 * page on its own. This list is the one place that says which pages these are.
 */
const PANEL_PAGES = [
  // An issue's page, over the issue pages it was opened from (D-069), and 새 이슈 in a project or in 전체 (D-070).
  /^\/demo\/w\/[^/]+\/p\/[^/]+\/work-items\/[^/]+$/,
  /^\/demo\/w\/[^/]+\/issues\/new$/,
];

/** An address's path, without its search or hash. */
export const pathOf = (href: string) => href.split(/[?#]/)[0]!;

/** An address's search values. */
export const searchOf = (href: string): Record<string, string> => {
  const at = href.indexOf('?');
  return at < 0 ? {} : Object.fromEntries(new URLSearchParams(href.slice(at + 1).split('#')[0]));
};

export const isPanelPage = (href: string) => PANEL_PAGES.some(page => page.test(pathOf(href)));

/** A path with the search values given, empty ones left out: hrefOf('/office/approvals/new', { kind: 'annual' }). */
export function hrefOf(path: string, search: Record<string, string | number | undefined | null> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

/**
 * The panel a screen holds. open shows a page in it (replace swaps the page shown for another), back returns to the
 * page shown before in the panel, and close takes the panel away with every page it showed.
 */
export type PanelHost = { open: (href: string, replace?: boolean) => void; back: () => void; close: () => void };

export const PanelHostContext = createContext<PanelHost | null>(null);

/** A screen's panel as its address holds it: the page shown and how many history entries the panel pushed over it. */
export type PanelPlace = { panel?: string; depth?: number };

/**
 * How many history entries the panel pushed over its screen. A panel whose address carries no depth was opened
 * directly (typed, restored, linked from outside) and pushed none: there is no screen entry under it to go back to.
 */
export const panelDepth = (place: PanelPlace) => (place.panel ? place.depth ?? 0 : 0);

/**
 * Whether a panel was opened directly and needs its screen put under it: the screen takes the entry's place and the
 * panel is pushed over it, so every way of closing it (its close, Escape, the backdrop, the browser's back) returns
 * to the screen instead of leaving the app.
 */
export const isOpenedDirectly = (place: PanelPlace) => !!place.panel && place.depth === undefined;

/**
 * How closing a panel moves: back past exactly the entries it pushed, never further, or, when it pushed none, by
 * putting its screen in its place.
 */
export function closeMove(place: PanelPlace): { kind: 'back'; steps: number } | { kind: 'replace' } {
  const depth = panelDepth(place);
  return depth > 0 ? { kind: 'back', steps: depth } : { kind: 'replace' };
}

/** The panel this is shown in: null on a page of its own. */
export const usePanelHost = () => useContext(PanelHostContext);

/**
 * Leaving a page when its work is done or dropped. back returns to what was shown before it (the page before in the
 * panel, else the panel closes; on a page of its own the address before, else fallback); replace puts another page in
 * its place; close takes the panel away, or on a page of its own goes to fallback.
 */
export function useLeave() {
  const host = usePanelHost();
  const router = useRouter();
  return {
    back: (fallback: string) => {
      if (host) host.back();
      else if (router.history.canGoBack()) router.history.back();
      else void router.navigate({ href: fallback, replace: true });
    },
    replace: (href: string) => {
      if (host && isPanelPage(href)) host.open(href, true);
      else void router.navigate({ href, replace: true });
    },
    close: (fallback: string) => {
      if (host) host.close();
      else void router.navigate({ href: fallback, replace: true });
    },
  };
}

/**
 * Goes to a page. Inside a screen that holds a panel, a page of the list opens in the panel; anything else, or
 * anywhere else, is an ordinary move, which also leaves the panel behind. The screen holding the panel passes its own
 * host, being outside the context it provides.
 */
export function useGo(own?: PanelHost | null) {
  const context = usePanelHost();
  const host = own ?? context;
  const router = useRouter();
  return (href: string, options: { replace?: boolean } = {}) => {
    if (host && isPanelPage(href)) host.open(href, options.replace);
    else void router.navigate({ href, replace: options.replace });
  };
}
export { useScreenPanel } from './use-screen-panel';

/** A screen's panel read from its address: a path at most 300 long, and the entries it pushed (1–99). */
export function parsePanelPlace(raw: Record<string, unknown>): PanelPlace {
  if (typeof raw.panel !== 'string' || !raw.panel.startsWith('/') || raw.panel.length > 300) return {};
  const depth = Number(raw.depth);
  return { panel: raw.panel, ...(Number.isInteger(depth) && depth >= 1 && depth <= 99 ? { depth } : {}) };
}

/** A screen's own place, without the panel over it. */
export const withoutPanel = <T extends PanelPlace>({ panel: _panel, depth: _depth, ...place }: T) => place;
