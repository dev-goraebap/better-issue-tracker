import { BottomSheet, Popover } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useId, useRef, useState } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { FrameBody, FrameHead } from '../frame';
import { NavIcon } from '../NavIcon';
import styles from './repeat-picker.module.css';

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
/** How a work item repeats (D-092): every interval days, weeks (on the weekdays) or months, up to a last day. */
export type Repeat = { frequency: 'daily' | 'weekly' | 'monthly'; interval: number; weekdays: Weekday[]; untilOn?: string };

const DAYS: [Weekday, string][] = [['MONDAY', '월'], ['TUESDAY', '화'], ['WEDNESDAY', '수'], ['THURSDAY', '목'], ['FRIDAY', '금'], ['SATURDAY', '토'], ['SUNDAY', '일']];
const UNITS = { daily: '일', weekly: '주', monthly: '개월' } as const;
const EVERY = { daily: '매일', weekly: '매주', monthly: '매월' } as const;

/** The pill's words: 매주 월·수, 2주마다 화, 매월 · 11월 30일까지. */
export const repeatText = (value?: Repeat) => {
  if (!value) return undefined;
  const every = value.interval > 1 ? `${value.interval}${UNITS[value.frequency]}마다` : EVERY[value.frequency];
  const days = value.frequency === 'weekly' && value.weekdays.length > 0
    ? ` ${DAYS.filter(([day]) => value.weekdays.includes(day)).map(([, word]) => word).join('·')}` : '';
  const until = value.untilOn ? ` · ${Number(value.untilOn.slice(5, 7))}월 ${Number(value.untilOn.slice(8, 10))}일까지` : '';
  return `${every}${days}${until}`;
};

/**
 * A work item's repetition as a property pill (D-092), drawn as the event's time (EventTimePicker): unset it reads 반복
 * in the quiet ink. Its box picks 매일 · 매주 · 매월, how many apart, a weekly rule's weekdays (none means the work item's
 * own) and a last day. Each occurrence is its own work item, made from this one. A phone opens it in a sheet.
 */
export function RepeatPicker({ value, onChange, onCommit, clearLabel = '반복 안 함' }: {
  value?: Repeat; onChange: (value?: Repeat) => void; clearLabel?: string; onCommit?: (value?: Repeat) => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [isOpen, setOpen] = useState(false);
  const titleId = useId();
  const [draft, setDraft] = useState(value); const current = useRef(value); const dirty = useRef(false);
  const shown = onCommit && isOpen ? draft : value;
  const open = (next: boolean) => {
    if (next) { current.current = value; setDraft(value); dirty.current = false; }
    else if (onCommit && dirty.current) { dirty.current = false; onCommit(current.current); }
    setOpen(next);
  };
  const change = (next?: Repeat) => {
    if (onCommit) { current.current = next; dirty.current = true; setDraft(next); }
    else onChange(next);
  };
  const text = repeatText(shown);
  const set = (patch: Partial<Repeat>) => change({ frequency: 'weekly', interval: 1, weekdays: [], ...shown, ...patch });
  const toggle = (day: Weekday) => {
    const days = shown?.weekdays ?? [];
    set({ weekdays: days.includes(day) ? days.filter(each => each !== day) : [...days, day] });
  };
  const pill = (ref?: (node: HTMLElement | null) => void, onClick?: () => void) => <span ref={ref} className={styles.pillWrap}>
    <button type="button" className={styles.pill} data-empty={!text || undefined} aria-haspopup="dialog" aria-expanded={isOpen}
      aria-label={text ? `반복: ${text}` : '반복 정하기'} onClick={onClick ?? (() => open(true))}>
      <NavIcon name="repeat" />{text ?? '반복'}
    </button>
  </span>;
  const box = <div className={styles.box} data-size={isMobile ? 'lg' : undefined}>
    <div className={styles.frequencies} role="radiogroup" aria-label="반복">
      {(['daily', 'weekly', 'monthly'] as const).map(frequency => <button key={frequency} type="button" role="radio" className={styles.choice}
        aria-checked={shown?.frequency === frequency} onClick={() => set({ frequency })}>{EVERY[frequency]}</button>)}
    </div>
    {shown && <>
      <label className={styles.row}><span>간격</span>
        <span className={styles.every}>
          <input type="number" min={1} max={52} className={styles.input} value={shown.interval}
            onChange={event => set({ interval: Math.min(52, Math.max(1, Number(event.target.value) || 1)) })} />
          {UNITS[shown.frequency]}마다
        </span>
      </label>
      {shown.frequency === 'weekly' && <div className={styles.days} role="group" aria-label="요일">
        {DAYS.map(([day, word]) => <button key={day} type="button" className={styles.day} aria-pressed={shown.weekdays.includes(day)} onClick={() => toggle(day)}>{word}</button>)}
      </div>}
      <label className={styles.row}><span>끝나는 날</span>
        <input type="date" className={styles.input} value={shown.untilOn ?? ''} onChange={event => set({ untilOn: event.target.value || undefined })} />
      </label>
      <button type="button" className={styles.clear} onClick={() => { change(undefined); open(false); }}>
        <NavIcon name="close" />{clearLabel}
      </button>
    </>}
  </div>;
  if (isMobile) return <>
    {pill()}
    {isOpen && <BottomSheet isOpen onOpenChange={open} label="반복" height="hug">
      <FrameHead title="반복" titleId={titleId} onClose={() => open(false)} />
      <FrameBody>{box}</FrameBody>
    </BottomSheet>}
  </>;
  return <Popover isOpen={isOpen} onOpenChange={open} placement="below" alignment="start" width={280} label="반복" className={styles.popover} content={box}>
    {({ ref, onClick }) => pill(ref, onClick)}
  </Popover>;
}
