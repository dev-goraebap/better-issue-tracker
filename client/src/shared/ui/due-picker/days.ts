/** Days as YYYY-MM-DD, counted as whole days in the member's own time zone (DuePicker, DueChip). */
const DAY = 86_400_000;
export const pad = (value: number) => String(value).padStart(2, '0');
/** Today in the member's own time zone. */
export const todayOf = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; };
const at = (day: string) => Date.parse(`${day}T00:00:00Z`);
export const plus = (today: string, days: number) => new Date(at(today) + days * DAY).toISOString().slice(0, 10);
/** How many days from one day to another: 0 the same day, 1 the next, -2 two days before. */
export const daysFrom = (from: string, to: string) => Math.round((at(to) - at(from)) / DAY);
export const weekday = (day: string) => new Date(at(day)).getUTCDay();
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 10월 30일 (목). */
export const short = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 (${WEEKDAYS[weekday(day)]})`;
