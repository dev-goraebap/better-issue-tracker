import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@astryxdesign/core';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { NavIcon } from '../NavIcon';
import styles from './zoom-viewer.module.css';

/**
 * A picture or a diagram over the whole screen, to look at closely (BIT-95): the page's own modal dialog (Esc closes it,
 * focus stays inside), the thing fitted to the screen at first, then the wheel, a drag, two fingers or a double press
 * zooms and moves it. The bar on top names it and zooms out, in, back to fit, and closes.
 */
export function ZoomViewer({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return createPortal(<dialog ref={dialog} className={styles.viewer} aria-label={label} onClose={onClose}>
    <TransformWrapper minScale={0.25} maxScale={8} centerOnInit limitToBounds={false} wheel={{ step: 0.12 }} doubleClick={{ mode: 'zoomIn', step: 0.7 }}>
      {({ zoomIn, zoomOut, resetTransform }) => <>
        <div className={styles.bar}>
          <span className={styles.title}>{label}</span>
          <IconButton label="축소" tooltip="축소" variant="ghost" size="sm" icon={<NavIcon name="minus" />} onClick={() => zoomOut()} />
          <IconButton label="확대" tooltip="확대" variant="ghost" size="sm" icon={<NavIcon name="plus" />} onClick={() => zoomIn()} />
          <IconButton label="화면에 맞추기" tooltip="화면에 맞추기" variant="ghost" size="sm" icon={<NavIcon name="retry" />} onClick={() => resetTransform()} />
          <IconButton label="닫기" tooltip="닫기 (Esc)" variant="ghost" size="sm" icon={<NavIcon name="close" />} onClick={() => dialog.current?.close()} />
        </div>
        <TransformComponent wrapperClass={styles.stage} contentClass={styles.content}>{children}</TransformComponent>
      </>}
    </TransformWrapper>
  </dialog>, document.body);
}
