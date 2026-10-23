import type { CSSProperties, PointerEvent } from 'react';
import { KIND_NAMES, type DemoEvent } from '../model/events';
import type { Bar } from '../model/layout';
import styles from './calendar.module.css';

/** One bar over whole days, in its kind's tint; an event that may move is carried by its bar. */
export function BarButton({ bar, style, fromBefore, toAfter, isMoving = false, onEvent, onPress }: {
  bar: Bar; style: CSSProperties; fromBefore: boolean; toAfter: boolean; isMoving?: boolean;
  onEvent: (event: DemoEvent) => void; onPress?: (pointer: PointerEvent, event: DemoEvent) => void;
}) {
  const event = bar.event;
  return <button type="button" className={styles.bar} style={style} data-from-before={fromBefore || undefined} data-to-after={toAfter || undefined}
    data-kind={event.kind} data-draggable={onPress ? true : undefined} data-moving={isMoving || undefined}
    title={`${KIND_NAMES[event.kind]} · ${event.title}`}
    onPointerDown={onPress && (pointer => onPress(pointer, event))} onClick={() => onEvent(event)}>
    <span className={styles.barName}>{event.title}</span>
  </button>;
}
