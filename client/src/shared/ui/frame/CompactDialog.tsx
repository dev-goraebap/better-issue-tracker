import { BottomSheet } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import type { ReactNode } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { ContentModal } from '../side-panel/ContentModal';
import { FrameBody } from './FrameBody';
import { FrameFoot } from './FrameFoot';
import { FrameHead } from './FrameHead';
import styles from './frame.module.css';

/**
 * 짧은 창: a short task that needs no address of its own (a confirmation, a few fields, picking from a list). A desktop
 * shows it in the quick form's modal (새 이슈's, D-070): near the top of the window on one surface with no rules
 * between its head, body and foot, as wide as its content asks (width); a phone shows it as a bottom sheet with the
 * same head, body and foot. A task
 * that wants the whole phone screen (a reason to write, a picture to crop, a long text) is a page instead, opened in a
 * panel (Surface, RoutedPanel). onSubmit wraps the body and foot in a form, so Enter in a field submits. isOpen lets a
 * caller keep it mounted and close it with its animation; left out, it is open while it is rendered.
 */
export function CompactDialog({ isOpen = true, title, subtitle, width = 560, isBusy = false, isAlert = false, footer, footerStart, onSubmit, onClose, children }: {
  isOpen?: boolean; title: string; subtitle?: string; width?: number; isBusy?: boolean;
  /** A question that must be answered (an alert dialog), which the router's own back leaves to its answer. */
  isAlert?: boolean;
  footer: ReactNode; footerStart?: ReactNode; onSubmit?: () => void; onClose: () => void; children: ReactNode;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const close = () => { if (!isBusy) onClose(); };
  const parts = <>
    <FrameBody isStack>{children}</FrameBody>
    <FrameFoot start={footerStart}>{footer}</FrameFoot>
  </>;
  const content = <>
    <FrameHead title={title} subtitle={subtitle} onClose={close} />
    {onSubmit ? <form onSubmit={event => { event.preventDefault(); if (!isBusy) onSubmit(); }}>{parts}</form> : parts}
  </>;
  if (isMobile) {
    const alert = isAlert ? { role: 'alertdialog', 'data-router-history': '' } : {};
    return <BottomSheet isOpen={isOpen} onOpenChange={open => { if (!open) close(); }} label={title} height="hug" {...alert}>{content}</BottomSheet>;
  }
  if (!isOpen) return null;
  return <ContentModal label={title} size="form" width={width} role={isAlert ? 'alertdialog' : undefined} isRouted={isAlert} focus="field" onClose={close}>
    <div className={styles.compact}>{content}</div>
  </ContentModal>;
}
