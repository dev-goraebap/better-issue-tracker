import { createContext, useContext } from 'react';

/**
 * Where a page's content is shown: in a panel, with the address of the page itself and the panel's own close, or, when
 * there is none, on a page of its own.
 */
export type PanelSurface = { pageHref: string; onClose: () => void; onBack?: () => void };

export const SurfaceContext = createContext<PanelSurface | null>(null);

export const usePanelSurface = () => useContext(SurfaceContext);
