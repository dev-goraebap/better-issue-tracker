import { useFillRoom } from '../use-fill-room';
import styles from './list-fill.module.css';

/** The standard decorative dot grid stretches into the room after a list's count. */
export function ListFill() {
  const room = useFillRoom<HTMLDivElement>(true);
  return <div ref={room} className={styles.fill} aria-hidden="true" />;
}
