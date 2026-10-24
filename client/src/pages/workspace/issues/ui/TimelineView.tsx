import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Link } from '@tanstack/react-router';
import { PageState } from '@/shared/ui';
import { spanOf, StatusBadge, type IssueSearch, type WorkItem } from '@/entities/work-item';
import { currentDay } from '../model/dates';
import styles from './timeline.module.css';

const DAY = 86_400_000;
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY;

/**
 * The 타임라인 view: each issue with a day as a bar along the days (D-066), from its start to its due day (one day when
 * it has only one), drawn as Linear's (D-067): the issue's key and title in a column that stays while the days scroll
 * sideways, the months over each week's first date, today an accent pill ruled down the rows; it opens with today in
 * view. An issue without a day is not drawn here.
 */
export function TimelineView({ workspaceId, items, search }: { workspaceId: string; items: readonly WorkItem[]; search: IssueSearch }) {
  const box = useRef<HTMLDivElement>(null);
  const today = currentDay();
  // Opens on today: its column a third of the way across the days in view. Only on opening: a later read (labels,
  // members on a window's focus) leaves the scroll where the member put it.
  useLayoutEffect(() => {
    const element = box.current;
    const mark = element?.querySelector<HTMLElement>('[data-today]');
    const name = element?.querySelector<HTMLElement>('[role="columnheader"]');
    if (element && mark && name) element.scrollLeft = Math.max(0, mark.offsetLeft - name.offsetWidth - (element.clientWidth - name.offsetWidth) / 3);
  }, []);
  const dated = items.flatMap(item => {
    const span = spanOf(item);
    return span ? [{ item, ...span }] : [];
  }).sort((a, b) => a.start.localeCompare(b.start));
  if (dated.length === 0) return <PageState title="날짜가 있는 이슈가 없습니다" description="시작일이나 기한을 정하면 여기에서 기간 막대로 보입니다." />;
  const first = Math.min(...dated.map(row => dayNumber(row.start)), dayNumber(today)) - 2;
  const last = Math.max(...dated.map(row => dayNumber(row.end)), dayNumber(today)) + 5;
  const days = Array.from({ length: last - first + 1 }, (_, index) => new Date((first + index) * DAY).toISOString().slice(0, 10));
  const at = (day: string) => dayNumber(day) - first;
  return <div ref={box} className={styles.timeline} style={{ '--days': days.length } as CSSProperties} role="table" aria-label="이슈 타임라인">
    <div className={styles.head} role="row">
      <span className={styles.corner} role="columnheader">이슈</span>
      <div className={styles.days} role="columnheader">
        {days.map((day, index) => (day.endsWith('-01') || index === 0) && <span key={`m${day}`} className={styles.month} style={{ gridColumn: index + 1 }}>
          {Number(day.slice(5, 7))}월</span>)}
        {days.map((day, index) => {
          const isToday = day === today;
          const isWeek = new Date(`${day}T00:00:00Z`).getUTCDay() === 0;
          return (isToday || isWeek) && <span key={day} className={styles.day} style={{ gridColumn: index + 1 }} data-today={isToday || undefined}>{Number(day.slice(8))}</span>;
        })}
      </div>
    </div>
    {dated.map(({ item, start, end }) => <div key={item.id} className={styles.row} role="row">
      <Link to="/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} search={search}
        className={styles.name} role="rowheader"><span className={styles.key}>{item.key}</span><span className={styles.title}>{item.title}</span></Link>
      <div className={styles.track} role="cell">
        <span className={styles.today} style={{ gridColumn: at(today) + 1 }} aria-hidden="true" />
        <span className={styles.bar} data-status={item.columnCategory ?? undefined} style={{ gridColumn: `${at(start) + 1} / ${at(end) + 2}` }}
          title={`${item.key} ${item.title} · ${Number(start.slice(5, 7))}/${Number(start.slice(8))}–${Number(end.slice(5, 7))}/${Number(end.slice(8))}`}>
          {item.columnCategory ? <StatusBadge category={item.columnCategory} /> : <span className={styles.barTitle}>{item.title}</span>}
        </span>
      </div>
    </div>)}
  </div>;
}
