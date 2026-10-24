import type { ReactNode } from 'react';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';

/**
 * The layers over every screen (toasts, popovers, dialogs). A toast keeps clear of what a hand covers: a desktop shows it
 * at the bottom end, a phone at the top, above its tab bar and floating actions (bit-frontend 04).
 */
export function AppLayers({ children }: { children: ReactNode }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return <LayerProvider toast={{ position: isMobile ? 'topEnd' : 'bottomEnd' }}>{children}</LayerProvider>;
}
