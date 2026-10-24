import type { MouseEvent, ReactNode } from 'react';
import { NavIcon } from '@/shared/ui';
import styles from './app-shell.module.css';

/**
 * One step of the header row's trail: a link to it, or the page in view (no href, the last step), or a control of the
 * page's own drawn in its place (content: a switcher among the step's neighbours).
 */
export type TrailStep = { label: string; href?: string; onClick?: (event: MouseEvent<HTMLAnchorElement>) => void; content?: ReactNode };

/** The trail, as Plane's: every step 13px/500, those before the page muted and linked, a small chevron between them. */
export function Trail({ steps }: { steps: TrailStep[] }) {
  return <>{steps.map((step, index) => {
    const isLast = index === steps.length - 1;
    return <span key={`${index}-${step.label}`} className={styles.crumbGroup} data-current={isLast || undefined}>
      {step.content ?? (isLast || !step.href
        ? <span className={isLast ? styles.crumbCurrent : styles.crumbStep} aria-current={isLast ? 'page' : undefined}>{step.label}</span>
        : <a href={step.href} onClick={step.onClick} className={styles.crumbLink}>{step.label}</a>)}
      {!isLast && <span className={styles.crumbSeparator} aria-hidden="true"><NavIcon name="forward" /></span>}
    </span>;
  })}</>;
}
