import { BottomSheet, Popover } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useId, useState, type KeyboardEvent } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { FrameBody, FrameHead } from '../frame';
import { NavIcon } from '../NavIcon';
import styles from './due-picker.module.css';

const DAY = 86_400_000;
const pad = (value: number) => String(value).padStart(2, '0');
/** Today in the member's own time zone. */
const todayOf = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; };
const at = (day: string) => Date.parse(`${day}T00:00:00Z`);
const plus = (today: string, days: number) => new Date(at(today) + days * DAY).toISOString().slice(0, 10);
const weekday = (day: string) => new Date(at(day)).getUTCDay();
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const short = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 (${WEEKDAYS[weekday(day)]})`;
const presetsOf = (today: string) => [
  { label: '오늘', day: today },
  { label: '내일', day: plus(today, 1) },
  { label: '이번 주 금요일', day: plus(today, (5 - weekday(today) + 7) % 7 || 7) },
  { label: '다음 주 월요일', day: plus(today, (1 - weekday(today) + 7) % 7 || 7) },
  { label: '1주 뒤', day: plus(today, 7) },
];

/** Words as a day, as Linear reads them: 오늘·내일·모레, '3일'·'2주', '10월 30일' or '10/30' (this year, or next if past). */
function parseDay(words: string, today: string): string | undefined {
  const text = words.replace(/\s+/g, '');
  if (!text) return undefined;
  if (text === '오늘') return today;
  if (text === '내일') return plus(today, 1);
  if (text === '모레') return plus(today, 2);
  const span = /^(\d{1,3})(일|주)(뒤|후)?$/.exec(text);
  if (span) return plus(today, Number(span[1]) * (span[2] === '주' ? 7 : 1));
  const date = /^(\d{1,2})(?:월|\/|\.)(\d{1,2})일?$/.exec(text);
  if (date) {
    const [month, day] = [Number(date[1]), Number(date[2])];
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
    const thisYear = `${today.slice(0, 4)}-${pad(month)}-${pad(day)}`;
    return thisYear < today ? `${Number(today.slice(0, 4)) + 1}${thisYear.slice(4)}` : thisYear;
  }
  return undefined;
}

/** How far off a day is, as Linear's pill says it: 오늘, 내일, 5일 뒤, 2일 지남. */
const offText = (day: string, today: string) => {
  const days = Math.round((at(day) - at(today)) / DAY);
  return days === 0 ? '오늘' : days === 1 ? '내일' : days > 0 ? `${days}일 뒤` : `${-days}일 지남`;
};

/**
 * A day as a property pill (D-067), 기한 by default: unset it reads its name in the quiet ink; set, how far off the day
 * is with an orange calendar. It opens a box to type the day in words ('내일', '3일', '10월 30일') over quick picks (오늘,
 * 내일, 이번 주 금요일, 다음 주 월요일, 1주 뒤), each with its date, and a way to clear it once one is set. A phone opens
 * it in a sheet. asDate shows the date itself (10월 2일 (목)) instead of how far off it is: a start date, or the due date
 * of a work item already done, is a fact, not a warning, so it never reads '19일 지남'.
 */
export function DuePicker({ value, onChange, label = '기한', asDate = false }: {
  value?: string | null; onChange: (day: string | undefined) => void; label?: string; asDate?: boolean;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [isOpen, setOpen] = useState(false);
  const [words, setWords] = useState('');
  const titleId = useId();
  const today = todayOf();
  const parsed = parseDay(words, today);
  const open = (next: boolean) => { setOpen(next); setWords(''); };
  const pick = (day: string | undefined) => { onChange(day); open(false); };
  const keys = (event: KeyboardEvent) => { if (event.key === 'Enter' && parsed) { event.preventDefault(); pick(parsed); } };
  const pill = (ref?: (node: HTMLElement | null) => void, onClick?: () => void) => <span ref={ref} className={styles.pillWrap}>
    <button type="button" className={styles.duePill} data-empty={!value || undefined} aria-haspopup="dialog" aria-expanded={isOpen}
      aria-label={value ? `${label}: ${short(value)}` : `${label} 정하기`} title={value ? short(value) : undefined} onClick={onClick ?? (() => open(true))}>
      <NavIcon name="calendar" />{value ? (asDate ? short(value) : offText(value, today)) : label}
    </button>
  </span>;
  const menu = <div className={styles.dueMenu} data-size={isMobile ? 'lg' : undefined}>
    <input className={styles.dueSearch} value={words} autoFocus={!isMobile} placeholder="예: 내일, 3일, 10월 30일" aria-label={`${label}을 말로 적기`}
      onChange={event => setWords(event.target.value)} onKeyDown={keys} />
    <div className={styles.dueList} role="listbox" aria-label={label}>
      {words && (parsed
        ? <div role="option" aria-selected={false} className={styles.dueOption} data-active onClick={() => pick(parsed)}><NavIcon name="calendar" /><span>{short(parsed)}</span><span className={styles.dueHint}>{offText(parsed, today)}</span></div>
        : <p className={styles.dueEmpty}>알아들을 수 없는 날짜입니다</p>)}
      {!words && presetsOf(today).map(preset => <div key={preset.label} role="option" aria-selected={value === preset.day} className={styles.dueOption} onClick={() => pick(preset.day)}>
        <NavIcon name="calendar" /><span>{preset.label}</span><span className={styles.dueHint}>{short(preset.day)}</span>
      </div>)}
      {!words && value && <div role="option" aria-selected={false} className={styles.dueOption} onClick={() => pick(undefined)}><NavIcon name="close" /><span>{label} 없애기</span></div>}
    </div>
  </div>;
  if (isMobile) return <>
    {pill()}
    {isOpen && <BottomSheet isOpen onOpenChange={open} label={label} height="hug">
      <FrameHead title={label} titleId={titleId} onClose={() => open(false)} />
      <FrameBody>{menu}</FrameBody>
    </BottomSheet>}
  </>;
  return <Popover isOpen={isOpen} onOpenChange={open} placement="below" alignment="start" width={280} label={label} className={styles.duePopover} content={menu}>
    {({ ref, onClick }) => pill(ref, onClick)}
  </Popover>;
}
