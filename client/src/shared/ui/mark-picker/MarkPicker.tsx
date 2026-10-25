import { useState } from 'react';
import { Popover } from '@astryxdesign/core';
import { MARK_ICONS, PALETTE } from '@/shared/config';
import { NavIcon } from '../NavIcon';
import styles from './mark-picker.module.css';

export type Mark = { icon: string; color: string };

/**
 * A view's or a project's mark, as Linear's: a square showing the icon in its colour, which opens a small popover of the
 * palette's colours over the icons; picking an icon closes it. size is the square's: sm (32px, beside a borderless
 * name) or md (a field's height, beside a labelled field).
 */
export function MarkPicker({ value, label, size = 'sm', isDisabled = false, onChange }: {
  value: Mark; label: string; size?: 'sm' | 'md'; isDisabled?: boolean; onChange: (mark: Mark) => void;
}) {
  const [isOpen, setOpen] = useState(false);
  return <Popover isOpen={isOpen} onOpenChange={setOpen} placement="below" alignment="start" width={248} label={label} className={styles.popover}
    content={<div className={styles.picker}>
      <div className={styles.colors} role="group" aria-label="색">
        {PALETTE.map(color => <button key={color.value} type="button" aria-pressed={value.color === color.value} aria-label={color.name}
          className={styles.color} style={{ background: color.value }} onClick={() => onChange({ ...value, color: color.value })} />)}
      </div>
      <div className={styles.icons} role="group" aria-label="아이콘">
        {MARK_ICONS.map(icon => <button key={icon} type="button" aria-pressed={value.icon === icon} aria-label={icon}
          className={styles.icon} style={{ color: value.color }} onClick={() => { onChange({ ...value, icon }); setOpen(false); }}><NavIcon name={icon} /></button>)}
      </div>
    </div>}>
    {({ ref, onClick }) => <span ref={ref} className={styles.wrap}>
      <button type="button" className={styles.mark} data-size={size} style={{ color: value.color }} aria-label={label} aria-expanded={isOpen}
        disabled={isDisabled} onClick={onClick}><NavIcon name={value.icon} /></button>
    </span>}
  </Popover>;
}
