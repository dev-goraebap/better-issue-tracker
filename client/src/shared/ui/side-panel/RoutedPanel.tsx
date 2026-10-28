import type { ReactNode } from 'react';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import type { PanelHost } from '@/shared/lib/routed-panel';
import { PanelDialog } from './PanelDialog';
import { SidePeek } from './SidePeek';
import { SurfaceContext } from './surface-context';

/**
 * The panel a screen holds (useScreenPanel), showing the page at href over the screen, as SandboxHr's: the page's own
 * Surface takes its header (back when the panel went deeper, 크게 보기 to the page itself, close) and its footer from
 * here. On a desktop place 'peek' (a detail, BIT-103) is the full-height panel at the right with the screen usable
 * beside it, and 'modal' a centred modal ('compact' suits a page that asks little, 'form' a quick form); on a phone it
 * fills the screen. Render it only while the screen's address names a panel.
 */
export function RoutedPanel({ label, href, depth, host, size = 'content', place = 'modal', children }: {
  label: string; href: string; depth: number; host: PanelHost; size?: 'content' | 'compact' | 'form'; place?: 'modal' | 'peek'; children: ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return <SurfaceContext.Provider value={{ pageHref: href, onClose: host.close, onBack: depth > 1 ? host.back : undefined }}>
    {place === 'peek' && !isMobile
      ? <SidePeek label={label} isRouted onClose={host.close}>{children}</SidePeek>
      : <PanelDialog label={label} size={size} isRouted onClose={host.close}>{children}</PanelDialog>}
  </SurfaceContext.Provider>;
}
