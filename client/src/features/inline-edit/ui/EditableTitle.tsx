import { useAutoGrow } from '@/shared/lib/auto-grow';
import styles from './inline-edit.module.css';

/**
 * A detail's title written in place (D-107): the heading's own type in a borderless box as tall as its lines. Enter
 * does not break the line (a title is one line); it moves on to the body.
 */
export function EditableTitle({ value, label, onChange, onEnter }: { value: string; label: string; onChange: (value: string) => void; onEnter?: () => void }) {
  const box = useAutoGrow(value, 640);
  return <textarea ref={box} className={styles.title} value={value} rows={1} aria-label={label} placeholder={label}
    onChange={event => onChange(event.target.value.replace(/\n/g, ' '))}
    onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); onEnter?.(); } }} />;
}
