import { BottomSheet, Dialog } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useId, type ReactNode } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { FrameBody } from './FrameBody';
import { FrameFoot } from './FrameFoot';
import { FrameHead } from './FrameHead';

/**
 * 짧은 창: a short task that needs no address of its own (a confirmation, a few fields, picking from a list). A desktop
 * shows it as a small dialog in the middle, a phone as a bottom sheet; both draw the same head, body and foot. A task
 * that wants the whole phone screen (a reason to write, a picture to crop, a long text) is a page instead, opened in a
 * panel (Surface, RoutedPanel). onSubmit wraps the body and foot in a form, so Enter in a field submits. isOpen lets a
 * caller keep it mounted and close it with its animation; left out, it is open while it is rendered.
 */
export function CompactDialog({ isOpen = true, title, subtitle, width = 440, isBusy = false, isAlert = false, footer, footerStart, onSubmit, onClose, children }: {
  isOpen?: boolean; title: string; subtitle?: string; width?: number; isBusy?: boolean;
  /** A question that must be answered (an alert dialog), which the router's own back leaves to its answer. */
  isAlert?: boolean;
  footer: ReactNode; footerStart?: ReactNode; onSubmit?: () => void; onClose: () => void; children: ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const titleId = useId();
  const close = () => { if (!isBusy) onClose(); };
  const parts = <>
    <FrameBody isStack>{children}</FrameBody>
    <FrameFoot start={footerStart}>{footer}</FrameFoot>
  </>;
  const content = <>
    <FrameHead title={title} subtitle={subtitle} onClose={close} titleId={titleId} />
    {onSubmit ? <form onSubmit={event => { event.preventDefault(); if (!isBusy) onSubmit(); }}>{parts}</form> : parts}
  </>;
  const alert = isAlert ? { role: 'alertdialog', 'data-router-history': '' } : {};
  if (isMobile) return <BottomSheet isOpen={isOpen} onOpenChange={open => { if (!open) close(); }} label={title} height="hug" {...alert}>{content}</BottomSheet>;
  return <Dialog isOpen={isOpen} onOpenChange={open => { if (!open) close(); }} purpose={onSubmit || isAlert ? 'form' : 'info'} width={width} padding={0}
    aria-labelledby={titleId} {...alert}>{content}</Dialog>;
}
