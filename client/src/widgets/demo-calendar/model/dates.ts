// Day and time helpers of SandboxHr's calendar (entities/calendar/model/dates), kept to what the views use. Days are
// written as 2026-10-23 and moments as wall-clock 2026-10-23T14:00:00 in Seoul, without a zone.

const pad = (value: number) => String(value).padStart(2, '0');
const iso = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

/** The demo's today: its sample data is dated around it, so the calendar opens there whatever the real date is. */
export const DEMO_TODAY = '2026-10-23';
export const currentDay = () => DEMO_TODAY;

/** The minutes since midnight now in Seoul, for the week's line of the time now. */
export function currentMinute(now = new Date()): number {
  const [hours, minutes] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(now).split(':').map(Number);
  return hours! * 60 + minutes!;
}

/** The day so many days later, or earlier when negative. */
export function shiftDay(day: string, by: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + by);
  return iso(date);
}

/** The same day so many months later, kept within the month (31 March less a month is 28 February). */
export function shiftMonth(day: string, by: number): string {
  const date = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + by);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(Number(day.slice(8)), last));
  return iso(date);
}

export const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
export const dayTitle = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 ${WEEKDAYS[weekdayOf(day)]}요일`;
/** 14:00 from 2026-10-07T14:00:00 or 14:00:00. */
export const clock = (value?: string) => (value ? (value.length > 8 ? value.slice(11, 16) : value.slice(0, 5)) : '');

/** The day an event ends on: an end at midnight belongs to the day before. */
export const lastDayOf = (event: { start: string; end: string }) => {
  const day = event.end.slice(0, 10);
  return event.end.slice(11, 16) === '00:00' && day > event.start.slice(0, 10) ? shiftDay(day, -1) : day;
};
