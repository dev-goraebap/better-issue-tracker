import { Button, Calendar, Popover, TextInput } from '@astryxdesign/core';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { useRef, useState } from 'react';
import { useOutsidePress } from '@/shared/lib/outside-press';
import { NavIcon } from '../NavIcon';
import { dateLabel, parseTyped, seoulToday } from './date-text';
import type { DateFieldProps } from './DateField';
import styles from './date-field.module.css';

/**
 * A date field for a desktop, one box like a combobox: pressed or focused, a calendar drops under it, while the date
 * may still be typed in the box (2026-09-30, 2026.9.30 or 20260930 all read). Out of focus the box reads the date as
 * words, 2026년 10월 1일 (목). The calendar has 오늘 and, for a field that may be empty, 지우기. A typed date counts
 * once it is whole and within min and max; until then the field holds no value and says what is wrong once the text is
 * long enough to be a date. The calendar keeps its own width however wide the box, and stays open while the box is
 * pressed again; a press elsewhere, Escape, Tab or a pick closes it.
 */
export function PopoverDateField({
  label, value, onChange, placeholder = 'YYYY-MM-DD', description, isLabelHidden, isRequired, isOptional, isDisabled, hasClear, min, max, status,
}: DateFieldProps) {
  // What is being typed; null shows the value itself.
  const [draft, setDraft] = useState<string | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const anchor = useRef<HTMLElement>(null);
  const popup = useRef<HTMLElement>(null);
  useOutsidePress(isOpen, [anchor, popup], () => setOpen(false));
  const today = seoulToday() as ISODateString;
  const inRange = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const text = draft ?? (isFocused || !value ? value ?? '' : dateLabel(value));
  const typed = draft?.trim() ? parseTyped(draft) as ISODateString | undefined : undefined;
  const typedError = draft && draft.trim().length >= 8
    ? !typed ? '2026-09-30처럼 연-월-일로 적어 주세요.'
      : !inRange(typed) ? rangeText(min, max) : undefined
    : undefined;

  const type = (next: string) => {
    const iso = parseTyped(next) as ISODateString | undefined;
    // Eight digits are a whole date, so the field shows it as 2026-10-09 at once; other forms wait for more typing.
    setDraft(iso && inRange(iso) && /^\d{8}$/.test(next.trim()) ? null : next);
    if (!next.trim()) onChange(undefined);
    else if (iso && inRange(iso)) { if (iso !== value) onChange(iso); }
    else if (value) onChange(undefined);
  };
  const pick = (iso: ISODateString | undefined) => {
    setDraft(null);
    onChange(iso);
    setOpen(false);
  };

  // The calendar is portalled but its events still bubble here through React; only the box itself opens it.
  const inBox = (target: EventTarget | null) => !!anchor.current?.contains(target as Node);
  return <section ref={anchor} className={styles.field}
    onFocus={event => { if (!inBox(event.target)) return; setFocused(true); if (!isDisabled) setOpen(true); }}
    onBlur={event => { if (inBox(event.target) && !inBox(event.relatedTarget)) { setFocused(false); if (draft !== null && !typed) setDraft(null); } }}
    onClick={event => { if (inBox(event.target) && !isDisabled) setOpen(true); }}>
    <TextInput label={label} isLabelHidden={isLabelHidden} description={description} isRequired={isRequired} isOptional={isOptional}
      value={text} onChange={type} placeholder={placeholder} isDisabled={isDisabled} startIcon={<NavIcon name="calendar" />}
      status={typedError ? { type: 'error', message: typedError } : status}
      onEnter={() => { if (typed && inRange(typed)) setDraft(null); setOpen(false); }}
      onKeyDown={event => { if (event.key === 'Escape' || event.key === 'Tab') setOpen(false); if (event.key === 'ArrowDown') setOpen(true); }} />
    <Popover anchorRef={anchor as React.RefObject<HTMLElement>} isOpen={isOpen} onOpenChange={setOpen} placement="below" alignment="start"
      width="max-content" hasLightDismiss={false}
      label={`${label} 달력`} hasAutoFocus={false} isEnabled={!isDisabled} content={<section ref={popup} className={styles.popover}>
        <Calendar value={value as ISODateString | undefined} onChange={iso => pick(iso)} hasVariableRowCount
          min={min as ISODateString | undefined} max={max as ISODateString | undefined} />
        <section className={styles.footer}>
          <Button label="오늘" variant="ghost" size="sm" isDisabled={!inRange(today)} onClick={() => pick(today)} />
          {(hasClear || isOptional) && <Button label="지우기" variant="ghost" size="sm" isDisabled={!value && !draft} onClick={() => pick(undefined)} />}
        </section>
      </section>} />
  </section>;
}

function rangeText(min?: string, max?: string): string {
  if (min && max) return `${min}부터 ${max}까지 고를 수 있습니다.`;
  return min ? `${min}부터 고를 수 있습니다.` : `${max}까지 고를 수 있습니다.`;
}
