const seoulDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Today in Seoul as 2026-09-30, the day the calendar's 오늘 picks. */
export const seoulToday = (now = new Date()) => seoulDate.format(now);

/**
 * A typed date as YYYY-MM-DD, or undefined when it is not a whole, real date. Dots, slashes and spaces between the
 * parts are read as hyphens, and eight digits in a row as a date, so 2026.9.30, 2026/09/30 and 20260930 all work.
 */
export function parseTyped(text: string): string | undefined {
  const trimmed = text.trim();
  const digits = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  const parts = digits ?? /^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\.?$/.exec(trimmed);
  if (!parts) return undefined;
  const [year, month, day] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return date.toISOString().slice(0, 10);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** A date as words for a field at rest: 2026-10-01 as 2026년 10월 1일 (목). */
export function dateLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  return `${year}년 ${month}월 ${day}일 (${WEEKDAYS[weekday]})`;
}
