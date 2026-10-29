import { NavIcon } from '../NavIcon';
import { daysFrom, short, todayOf, WEEKDAYS, weekday } from './days';
import styles from './due-picker.module.css';

/**
 * A due day as read in a list (BIT-124): a small chip with a calendar that says how near it is in words and colour. Past,
 * it is red and reads '2일 지남'; today orange '오늘'; then '내일', a weekday within the week ('금요일'), and the date beyond
 * it ('11월 3일'). A work item already done keeps the plain date in the quiet ink: its day is a fact, not a warning. Its
 * title gives the full day.
 */
export function DueChip({ day, isDone = false }: { day: string; isDone?: boolean }) {
  const days = daysFrom(todayOf(), day);
  const date = `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일`;
  const tone = isDone ? 'done' : days < 0 ? 'late' : days === 0 ? 'today' : 'ahead';
  const text = isDone ? date : days < 0 ? `${-days}일 지남` : days === 0 ? '오늘' : days === 1 ? '내일' : days < 7 ? `${WEEKDAYS[weekday(day)]}요일` : date;
  return <span className={styles.dueChip} data-tone={tone} title={`기한 ${short(day)}`}><NavIcon name="calendar" />{text}</span>;
}
