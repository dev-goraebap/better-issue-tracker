import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Link } from '@tanstack/react-router';
import { PageState } from '@/shared/ui';
import { issueDays, StatusBadge, type Issue, type IssueSearch } from '@/entities/demo-sample';
import styles from './timeline.module.css';

const DAY = 86_400_000;
const seoulDay = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(0, 10);
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY;
const TODAY = '2026-10-23';

/**
 * The 타임라인 view: each issue with a day as a bar along the days (D-066), across its own days when it takes place
 * (a release week), else from the day it was made to its due day, drawn as Linear's (D-067): the item's key and title in a column that stays while the days scroll sideways,
 * the months over each week's first date, today an accent pill ruled down the rows; it opens with today in view. An
 * issue without a day is not drawn here.
 */
export function TimelineView({ workspaceId, items, search }: { workspaceId: string; items: readonly Issue[]; search: IssueSearch }) {
  const box = useRef<HTMLDivElement>(null);
  // Opens on today: its column a third of the way across the days in view.
  useLayoutEffect(() => {
    const element = box.current;
    const today = element?.querySelector<HTMLElement>('[data-today]');
    const name = element?.querySelector<HTMLElement>('[role="columnheader"]');
    if (element && today && name) element.scrollLeft = Math.max(0, today.offsetLeft - name.offsetWidth - (element.clientWidth - name.offsetWidth) / 3);
  }, [items]);
  const dated = items.flatMap(item => {
    const days = issueDays(item);
    if (!days) return [];
    const made = seoulDay(item.createdAt);
    const start = item.startAt ? days.first : made < days.last ? made : days.last;
    return [{ item, start, end: days.last }];
  }).sort((a, b) => a.start.localeCompare(b.start));
  if (dated.length === 0) return <PageState title="날짜가 있는 이슈가 없습니다" description="기한이나 일시를 정하면 여기에서 기간 막대로 보입니다." />;
  const first = Math.min(...dated.map(row => dayNumber(row.start)), dayNumber(TODAY)) - 2;
  const last = Math.max(...dated.map(row => dayNumber(row.end)), dayNumber(TODAY)) + 5;
  const days = Array.from({ length: last - first + 1 }, (_, index) => new Date((first + index) * DAY).toISOString().slice(0, 10));
  const at = (day: string) => dayNumber(day) - first;
  return <div ref={box} className={styles.timeline} style={{ '--days': days.length } as CSSProperties} role="table" aria-label="작업 타임라인">
    <div className={styles.head} role="row">
      <span className={styles.corner} role="columnheader">작업</span>
      <div className={styles.days} role="columnheader">
        {days.map((day, index) => (day.endsWith('-01') || index === 0) && <span key={`m${day}`} className={styles.month} style={{ gridColumn: index + 1 }}>
          {Number(day.slice(5, 7))}월</span>)}
        {days.map((day, index) => {
          const isToday = day === TODAY;
          const isWeek = new Date(`${day}T00:00:00Z`).getUTCDay() === 0;
          return (isToday || isWeek) && <span key={day} className={styles.day} style={{ gridColumn: index + 1 }} data-today={isToday || undefined}>{Number(day.slice(8))}</span>;
        })}
      </div>
    </div>
    {dated.map(({ item, start, end }) => <div key={item.id} className={styles.row} role="row">
      <Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} search={search}
        className={styles.name} role="rowheader"><span className={styles.key}>{item.key}</span><span className={styles.title}>{item.title}</span></Link>
      <div className={styles.track} role="cell">
        <span className={styles.today} style={{ gridColumn: at(TODAY) + 1 }} aria-hidden="true" />
        <span className={styles.bar} data-status={item.status} style={{ gridColumn: `${at(start) + 1} / ${at(end) + 2}` }}
          title={`${item.key} ${item.title} · ${Number(start.slice(5, 7))}/${Number(start.slice(8))}–${Number(end.slice(5, 7))}/${Number(end.slice(8))}`}>
          {item.status ? <StatusBadge status={item.status} /> : <span className={styles.barTitle}>{item.title}</span>}
        </span>
      </div>
    </div>)}
  </div>;
}
