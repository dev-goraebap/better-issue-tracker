import type { ReactNode } from 'react';
import { useFillRoom } from '../use-fill-room';
import styles from './state-region.module.css';

/** States share the room their container leaves; messages sit above centre, loading exactly at centre. */
export function StateRegion({ children, placement = 'upper', isCompact = false, label, busy = false }: {
  children?: ReactNode; placement?: 'upper' | 'center'; isCompact?: boolean; label?: string; busy?: boolean;
}) {
  const room = useFillRoom<HTMLDivElement>(!isCompact);
  return <div ref={room} className={styles.room} data-placement={placement} data-compact={isCompact || undefined}
    aria-busy={busy || undefined} aria-label={label} role={busy ? 'status' : undefined}>
    <div className={styles.content}>{children}</div>
  </div>;
}
