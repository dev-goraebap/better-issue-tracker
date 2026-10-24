import type { ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { PageLoader, useLoadingHold } from '@/shared/ui';

/**
 * The first visit has no screen to keep in view while the session and the first screen's reads are primed, so the rocket
 * stands alone, as SandboxHr's. index.html's boot screen has shown it since the page opened; this loader draws the same
 * frame in its place from the app's first frame, then plays it and fades once the first screen is drawn.
 */
export function FirstVisit({ children }: { children: ReactNode }) {
  const waiting = useRouterState({ select: state => !state.resolvedLocation });
  const showing = useLoadingHold(waiting, { delay: 100, minimum: 300, isShownAtFirst: true });
  return <>{children}<PageLoader isVisible={showing} place="window" /></>;
}
