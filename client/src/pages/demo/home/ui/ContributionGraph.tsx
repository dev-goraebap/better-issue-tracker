import { useLayoutEffect, useRef } from 'react';
import type { Contribution } from '@/entities/demo-sample';
import styles from './home.module.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** A day's shade by how much happened: none, then four steps, as GitHub's graph. */
const levelOf = (count: number) => (count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4);

/**
 * The workspace's year as GitHub's contribution graph (잔디): a column per week, Sunday on top, each day a small square
 * shaded by how much happened, the months named over their first week and 월·수·금 beside the rows; the total over it,
 * the shades' legend under it. A narrow screen scrolls it sideways, opening on the latest weeks.
 */
export function ContributionGraph({ days }: { days: readonly Contribution[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { const box = scroller.current; if (box) box.scrollLeft = box.scrollWidth; }, [days]);
  const weeks: Contribution[][] = [];
  days.forEach((day, index) => { if (index % 7 === 0) weeks.push([]); weeks[weeks.length - 1]!.push(day); });
  const total = days.reduce((sum, day) => sum + day.count, 0);
  return <div className={styles.graph}>
    <p className={styles.graphTotal}>지난 1년 동안 <strong>{total.toLocaleString('ko-KR')}</strong>번 기여</p>
    <div ref={scroller} className={styles.graphScroll}>
      <div className={styles.graphGrid} role="img" aria-label={`지난 1년 동안 ${total}번 기여한 활동 잔디`}>
        <span />
        <div className={styles.months} style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--cell))` }}>
          {weeks.map((week, index) => {
            const first = week[0]!.day;
            const isNewMonth = index === 0 || weeks[index - 1]![0]!.day.slice(5, 7) !== first.slice(5, 7);
            return <span key={first} className={styles.month}>{isNewMonth ? `${Number(first.slice(5, 7))}월` : ''}</span>;
          })}
        </div>
        <div className={styles.weekdays}>{WEEKDAYS.map((name, index) => <span key={name}>{index % 2 === 1 ? name : ''}</span>)}</div>
        <div className={styles.cells} style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--cell))` }}>
          {weeks.map(week => <div key={week[0]!.day} className={styles.week}>
            {week.map(day => <span key={day.day} className={styles.cell} data-level={levelOf(day.count)}
              title={`${Number(day.day.slice(5, 7))}월 ${Number(day.day.slice(8))}일 · ${day.count ? `${day.count}번` : '없음'}`} />)}
          </div>)}
        </div>
      </div>
    </div>
    <div className={styles.legend} aria-hidden="true">적음{[0, 1, 2, 3, 4].map(level => <span key={level} className={styles.cell} data-level={level} />)}많음</div>
  </div>;
}
