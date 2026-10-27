import { PALETTE } from '@/shared/config';
import styles from './color-palette.module.css';

/** The mark picker's palette, also usable on its own. A choice updates the parent's draft, never saves it. */
export function ColorPalette({ value, label = '색', isDisabled = false, onChange, onClear }: {
  value?: string | null; label?: string; isDisabled?: boolean; onChange: (color: string) => void; onClear?: () => void;
}) {
  return <div className={styles.colors} data-clear={onClear ? '' : undefined} role="group" aria-label={label}>
    {onClear && <button type="button" className={`${styles.color} ${styles.default}`} aria-pressed={!value} aria-label="기본색" title="기본색"
      disabled={isDisabled} onClick={onClear} />}
    {PALETTE.map(color => <button key={color.value} type="button" aria-pressed={value?.toLowerCase() === color.value} aria-label={color.name} title={color.name}
      className={styles.color} style={{ background: color.value }} disabled={isDisabled} onClick={() => onChange(color.value)} />)}
  </div>;
}
