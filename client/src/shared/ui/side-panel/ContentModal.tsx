import { useEffect, useLayoutEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { useCloseGhost } from './use-close-ghost';
import { useModalHeight } from './use-modal-height';
import styles from './side-panel.module.css';

const PARTS = { panel: styles.panel!, body: styles.body! };

/**
 * A detail or a form in the middle of the window over a dimmed page, on a desktop: a browser modal (showModal), so
 * everything else is dimmed and inert and focus stays inside it. Escape (the
 * dialog's cancel), a click on the backdrop and back (the overlay watcher's cancel) close it, and focus returns where it
 * was. It is at least its size's height (useModalHeight), eases between heights as its content changes, and fades in
 * and out (useCloseGhost). size is 'content' (a page's narrow width) or 'compact' (a person, a department). isRouted
 * marks pages with their own addresses, whose back the router keeps. width sets a quick form's own width (a short
 * window's, CompactDialog), role an alert dialog's, and focus 'field' starts in the first field rather than the first
 * control (a short window's close comes first), or on the modal itself when it has no field.
 */
export function ContentModal({ label, size, isRouted, width, role, focus = 'first', onClose, children }: {
  label: string; size: 'content' | 'compact' | 'form'; isRouted: boolean; width?: number; role?: 'alertdialog'; focus?: 'first' | 'field';
  onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  // Opened before it is measured (useModalHeight), so its first height is its content's, set before the first paint.
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!element.open) element.showModal();
    // The browser's modal focuses its first control; a page that names its own first field (data-autofocus) gets it (BIT).
    const named = element.querySelector<HTMLElement>('[data-autofocus]');
    if (named) named.focus();
    else if (focus === 'field') (element.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled)') ?? element).focus();
    const cancel = (event: Event) => { event.preventDefault(); close.current(); };
    element.addEventListener('cancel', cancel);
    return () => {
      element.removeEventListener('cancel', cancel);
      if (element.open) element.close();
      if (before?.isConnected && (!document.activeElement || document.activeElement === document.body || element.contains(document.activeElement))) before.focus();
    };
  }, [isRouted]);
  useModalHeight(dialog, size, PARTS);
  useCloseGhost(dialog, { backdrop: styles.backdrop!, place: styles.modalPlace!, closing: styles.closing! });
  // A click on the backdrop lands on the dialog itself, outside its box.
  const backdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    const isOutside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
    if (isOutside) onClose();
  };
  return <dialog ref={dialog} aria-label={label} role={role} className={styles.modal} data-size={size} tabIndex={-1} onClick={backdropClick}
    style={width ? { inlineSize: `min(${width}px, 100vw - 48px)` } : undefined}>
    {isRouted && <span data-router-history hidden />}
    {children}
  </dialog>;
}
