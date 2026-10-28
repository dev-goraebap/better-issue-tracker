import { createContext, useContext } from 'react';

/**
 * Where a page's content is shown: in a panel, with the address of the page itself, the panel's own close and the way
 * to the page itself (크게 보기, in the panel's place), or, when there is none, on a page of its own.
 */
export type PanelSurface = { pageHref: string; onClose: () => void; onBack?: () => void; onExpand: () => void };

export const SurfaceContext = createContext<PanelSurface | null>(null);

export const usePanelSurface = () => useContext(SurfaceContext);
