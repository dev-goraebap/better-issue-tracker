import { BottomSheet, Popover } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useId, useState } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { FrameBody, FrameHead } from '../frame';
import { IconPanel, type Mark } from './IconPanel';
import { MarkIcon } from './MarkIcon';
import styles from './icon-picker.module.css';

/**
 * The one picker for a project's or a view's mark (D-086): a square showing the mark in its colour, which opens the
 * icons and colours (IconPanel) in a popover under it on a desktop and in a bottom sheet on a phone. Picking an icon
 * closes it; a colour stays open to try another. size is the square's: sm (32px, beside a borderless name) or md
 * (a field's height, in a settings row).
 */
export function IconPicker({ value, label, size = 'sm', isDisabled = false, onChange }: {
  value: Mark; label: string; size?: 'sm' | 'md'; isDisabled?: boolean; onChange: (mark: Mark) => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [isOpen, setOpen] = useState(false);
  const titleId = useId();
  const panel = <IconPanel value={value} isMobile={isMobile} onPick={icon => { onChange({ ...value, icon }); setOpen(false); }}
    onColor={color => onChange({ ...value, color })} />;
  const square = (ref?: (node: HTMLElement | null) => void, onClick?: () => void) => <span ref={ref} className={styles.wrap}>
    <button type="button" className={styles.mark} data-size={size} style={{ color: value.color }} aria-label={label} aria-expanded={isOpen}
      aria-haspopup={isMobile ? 'dialog' : 'true'} disabled={isDisabled} onClick={onClick ?? (() => setOpen(true))}><MarkIcon name={value.icon} /></button>
  </span>;
  if (isMobile) return <>
    {square()}
    {isOpen && <BottomSheet isOpen onOpenChange={setOpen} label={label} height="tall">
      <FrameHead title="아이콘 고르기" titleId={titleId} onClose={() => setOpen(false)} />
      <FrameBody>{panel}</FrameBody>
    </BottomSheet>}
  </>;
  return <Popover isOpen={isOpen} onOpenChange={setOpen} placement="below" alignment="start" width={360} label={label} className={styles.popover} content={panel}>
    {({ ref, onClick }) => square(ref, onClick)}
  </Popover>;
}
