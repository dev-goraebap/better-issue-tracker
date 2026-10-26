import { Dialog } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import type { ReactNode } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { ContentModal } from './ContentModal';

/**
 * The frame of a detail or a form opened over the screen it is about, and nothing in it: on a desktop a modal in the
 * middle of the window, 'content' as wide as a narrow page (832px) so a detail reads the same as its page, 'compact'
 * (560px) for a person or a department, as tall as its content up to 90% of the window; on a phone it fills the
 * screen, bottom sheets being for short choices. 'form' (BIT, D-070) is a quick form of its own shape, Linear's new work item:
 * 720px wide near the top of the window, as tall as it is. isRouted marks a modal whose pages have their own addresses
 * (data-router-history), so the back button is left to the router and not taken by the overlay watcher.
 */
export function PanelDialog({ label, size = 'content', isRouted = false, onClose, children }: {
  label: string; size?: 'content' | 'compact' | 'form'; isRouted?: boolean; onClose: () => void; children: ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const close = (open: boolean) => { if (!open) onClose(); };
  if (isMobile) return <Dialog isOpen onOpenChange={close} variant="fullscreen" padding={0} aria-label={label}>
    {isRouted && <span data-router-history hidden />}{children}
  </Dialog>;
  return <ContentModal label={label} size={size} isRouted={isRouted} onClose={onClose}>{children}</ContentModal>;
}
