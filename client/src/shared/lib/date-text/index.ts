/** A day (2026-10-25) or a moment as a Date in the member's own time zone; a bare day is that day's start. */
const dateOf = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);

/** 10월 25일, with the year when it is not this year's. */
export function dateText(iso: string) {
  const date = dateOf(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('ko-KR', { ...(sameYear ? {} : { year: 'numeric' }), month: 'long', day: 'numeric' });
}
/** 2026년 10월. */
export const monthText = (iso: string) => `${dateOf(iso).getFullYear()}년 ${dateOf(iso).getMonth() + 1}월`;
