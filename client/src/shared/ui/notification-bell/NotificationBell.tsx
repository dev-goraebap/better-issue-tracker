import { useId, type CSSProperties, type MouseEvent } from 'react';
import { NavIcon } from '../NavIcon';
import styles from './notification-bell.module.css';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A link to the notices with how many are unread; the count hides at zero and caps at 99+. While any are unread the
 * bell itself lights up, on a desktop's menu head and a phone's header row alike: its strokes take a gradient (the
 * accent into a warm amber and coral) that turns slowly round, a soft glow of the same colours follows its outline, and
 * now and then it gives a small swing. For those who ask for less motion the colours stay, still. From SandboxHr's
 * entities/notification, the count given by the caller instead of read here.
 */
export function NotificationBell({ count, href, onOpen }: { count: number; href: string; onOpen: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const label = count > 0 ? `알림, 읽지 않은 알림 ${count}개` : '알림';
  const gradient = `bell-light-${useId().replace(/:/g, '')}`;
  return <a href={href} className={styles.bell} data-unread={count > 0 || undefined} aria-label={label} title="알림" onClick={onOpen}
    style={count > 0 ? { '--bell-stroke': `url(#${gradient})` } as CSSProperties : undefined}>
    {count > 0 && <svg className={styles.defs} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--bell-glow-cool)' }} />
          <stop offset="45%" style={{ stopColor: 'var(--bell-glow-warm)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--bell-glow-hot)' }} />
          {!reducedMotion() && <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="3s" repeatCount="indefinite" />}
        </linearGradient>
      </defs>
    </svg>}
    <NavIcon name="bell" />
    {count > 0 && <span className={styles.badge} aria-hidden="true">{count > 99 ? '99+' : count}</span>}
  </a>;
}
