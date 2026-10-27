import type { CSSProperties } from 'react';
import { DefaultAvatar, NavIcon } from '@/shared/ui';
import type { Notice } from '../api/notification';
import styles from './notification-avatar.module.css';

/** A human trigger uses their profile picture; a scheduler uses a labelled system avatar. */
export function NotificationAvatar({ notice, size = 32 }: { notice: Notice; size?: 32 | 40 }) {
  const actor = notice.actor;
  if (actor?.id && !actor.system) return <DefaultAvatar seed={actor.id} name={actor.name} size={size} />;
  return <span className={styles.system} style={{ '--notice-avatar-size': `${size}px` } as CSSProperties} role="img" aria-label={actor?.name ?? '알림'}><NavIcon name="system" /></span>;
}
