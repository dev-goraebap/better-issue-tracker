import { BottomSheet, Popover, Switch } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useId, useRef, useState } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { FrameBody, FrameHead } from '../frame';
import { NavIcon } from '../NavIcon';
import styles from './event-time-picker.module.css';

/** When an event happens, in the member's own time zone: a day, and either its start and end times or the whole day. */
export type EventTime = { day?: string; start?: string; end?: string; allDay: boolean };

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const dayWords = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return `${month}월 ${date}일 (${WEEKDAYS[new Date(Date.UTC(year!, month! - 1, date!)).getUTCDay()]})`;
};
/** The pill's words: 10월 28일 (화) 10:00–11:00, 10월 28일 (화) 종일, or none while no day is set. */
export const eventTimeText = (value: EventTime) => !value.day ? undefined
  : value.allDay ? `${dayWords(value.day)} 종일`
  : `${dayWords(value.day)}${value.start ? ` ${value.start}${value.end ? `–${value.end}` : ''}` : ''}`;

/**
 * An event's time as a property pill (D-092), drawn as the others (PropertyPicker, DuePicker): unset it reads 일시 in the
 * quiet ink. It opens a box with the day, a 종일 switch, and the start and end times while it is not all day; an end
 * before the start moves with it. A phone opens it in a sheet.
 */
export function EventTimePicker({ value, onChange, onCommit, label = '일시' }: {
  value: EventTime; onChange: (value: EventTime) => void; label?: string;
  /** In an inspector, edit inside the popover and persist once it closes. */
  onCommit?: (value: EventTime) => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [isOpen, setOpen] = useState(false);
  const titleId = useId();
  const [draft, setDraft] = useState(value);
  const current = useRef(value); const dirty = useRef(false);
  const shown = onCommit && isOpen ? draft : value;
  const text = eventTimeText(shown);
  const open = (next: boolean) => {
    if (next) { current.current = value; setDraft(value); dirty.current = false; }
    else if (onCommit && dirty.current) { dirty.current = false; onCommit(current.current); }
    setOpen(next);
  };
  const change = (next: EventTime) => {
    if (onCommit) { current.current = next; dirty.current = true; setDraft(next); }
    else onChange(next);
  };
  const set = (patch: Partial<EventTime>) => {
    const next = { ...shown, ...patch };
    if (next.start && next.end && next.end < next.start) next.end = next.start;
    change(next);
  };
  const pill = (ref?: (node: HTMLElement | null) => void, onClick?: () => void) => <span ref={ref} className={styles.pillWrap}>
    <button type="button" className={styles.pill} data-empty={!text || undefined} aria-haspopup="dialog" aria-expanded={isOpen}
      aria-label={text ? `${label}: ${text}` : `${label} 정하기`} onClick={onClick ?? (() => open(true))}>
      <NavIcon name="calendar" />{text ?? label}
    </button>
  </span>;
  const box = <div className={styles.box} data-size={isMobile ? 'lg' : undefined}>
    <label className={styles.row}><span>날짜</span>
      <input type="date" className={styles.input} value={shown.day ?? ''} onChange={event => set({ day: event.target.value || undefined })} />
    </label>
    <div className={styles.row}><span>종일</span><Switch label="종일" isLabelHidden size="sm" value={shown.allDay} onChange={allDay => set({ allDay })} /></div>
    {!shown.allDay && <>
      <label className={styles.row}><span>시작</span>
        <input type="time" className={styles.input} value={shown.start ?? ''} onChange={event => set({ start: event.target.value || undefined })} />
      </label>
      <label className={styles.row}><span>끝</span>
        <input type="time" className={styles.input} value={shown.end ?? ''} onChange={event => set({ end: event.target.value || undefined })} />
      </label>
    </>}
    {text && <button type="button" className={styles.clear} onClick={() => { change({ allDay: shown.allDay }); open(false); }}>
      <NavIcon name="close" />{label} 없애기
    </button>}
  </div>;
  if (isMobile) return <>
    {pill()}
    {isOpen && <BottomSheet isOpen onOpenChange={open} label={label} height="hug">
      <FrameHead title={label} titleId={titleId} onClose={() => open(false)} />
      <FrameBody>{box}</FrameBody>
    </BottomSheet>}
  </>;
  return <Popover isOpen={isOpen} onOpenChange={open} placement="below" alignment="start" width={260} label={label} className={styles.popover} content={box}>
    {({ ref, onClick }) => pill(ref, onClick)}
  </Popover>;
}
