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
/** How long before something: 10분 전, 1시간 전, 1시간 30분 전, 1일 전. */
export function beforeText(minutes: number) {
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes % 1440 === 0) return `${minutes / 1440}일 전`;
  return minutes % 60 === 0 ? `${minutes / 60}시간 전` : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 전`;
}

/**
 * When something happened, as Linear says it: 방금, 5분 전, 3시간 전, then 어제 for the calendar day before today, then
 * the day (10월 25일). Two days back is its date even when under 48 hours ago (BIT-124).
 */
export function agoText(iso: string, now = Date.now()) {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(iso).toDateString() === yesterday.toDateString() ? '어제' : dateText(iso);
}

/** A moment in full, for a tooltip: 2026년 10월 28일 오후 3:04. */
export const momentText = (iso: string) => new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
