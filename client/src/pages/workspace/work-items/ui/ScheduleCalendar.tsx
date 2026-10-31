import { useFillRoom } from '@/shared/ui';
import type { WorkItem } from '@/entities/work-item';
import { CalendarBar } from './CalendarBar';
import { WorkItemCalendar } from './WorkItemCalendar';
import styles from './views.module.css';

/** Mounted after the request boundary so the calendar measures the available content height. */
export function ScheduleCalendar({ workspaceId, items, day, onPlace, onOpen, onMove }: {
  workspaceId: string; items: readonly WorkItem[]; day: string; onPlace: (day: string) => void;
  onOpen: (href: string) => void; onMove?: (item: WorkItem, days: number) => void;
}) {
  const room = useFillRoom<HTMLDivElement>(true);
  return <div ref={room} className={styles.calendarRoom}>
    <div className={styles.calendarBar}><CalendarBar day={day} onPlace={onPlace} /></div>
    <WorkItemCalendar workspaceId={workspaceId} items={items} anchor={day} onOpen={onOpen} onMove={onMove} />
  </div>;
}
