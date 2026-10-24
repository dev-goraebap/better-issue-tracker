import type { ReactNode } from 'react';
import type { PanelHost } from '@/shared/lib/routed-panel';
import { PanelDialog } from './PanelDialog';
import { SurfaceContext } from './surface-context';

/**
 * The panel a screen holds (useScreenPanel), showing the page at href in a centred modal over the screen, as
 * SandboxHr's: the page's own Surface takes its header (back when the panel went deeper, 크게 보기 to the page itself,
 * close) and its footer from here; size 'compact' suits a page that asks little. Render it only while the screen's
 * address names a panel. (SandboxHr's side peek is not brought over yet.)
 */
export function RoutedPanel({ label, href, depth, host, size = 'content', children }: {
  label: string; href: string; depth: number; host: PanelHost; size?: 'content' | 'compact' | 'form'; children: ReactNode;
}) {
  return <SurfaceContext.Provider value={{ pageHref: href, onClose: host.close, onBack: depth > 1 ? host.back : undefined }}>
    <PanelDialog label={label} size={size} isRouted onClose={host.close}>{children}</PanelDialog>
  </SurfaceContext.Provider>;
}
