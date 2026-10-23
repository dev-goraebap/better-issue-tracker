import { NavIcon } from '@/shared/ui';
import type { DemoEvent } from '../model/events';
import styles from './calendar.module.css';

/** A small mark on an occurrence of a repeating event; one moved on its own is marked apart. */
export function RepeatMark({ event }: { event: Pick<DemoEvent, 'recurring' | 'changed'> }) {
  if (!event.recurring) return null;
  return <span className={styles.repeatMark} data-changed={event.changed || undefined} role="img"
    aria-label={event.changed ? '반복 일정, 이 회차만 바뀜' : '반복 일정'} title={event.changed ? '이 회차만 바뀐 반복 일정' : '반복 일정'}>
    <NavIcon name={event.changed ? 'edit' : 'repeat'} />
  </span>;
}
