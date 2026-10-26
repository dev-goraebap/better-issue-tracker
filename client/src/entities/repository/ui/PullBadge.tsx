import { NavIcon } from '@/shared/ui';
import type { PullBadge as Badge } from '../api/repository';
import styles from './repository.module.css';

/**
 * An issue's pull requests on its card or row, as Kaneo's: `#12` for one, `2 PR` for more, in the state of the most
 * advanced (merged, then open, draft, closed); the names on hover.
 */
export function PullBadge({ pulls }: { pulls: readonly Badge[] }) {
  if (pulls.length === 0) return null;
  const rank = { merged: 0, open: 1, draft: 2, closed: 3 } as const;
  const lead = pulls.slice().sort((a, b) => rank[a.state] - rank[b.state])[0]!;
  const icon = lead.state === 'merged' ? 'merge' : lead.state === 'draft' ? 'pull-request-draft' : lead.state === 'closed' ? 'pull-request-closed' : 'pull-request';
  return <span className={styles.badge} data-state={lead.state} title={pulls.map(pull => `#${pull.number} ${pull.title}`).join('\n')}>
    <NavIcon name={icon} />{pulls.length === 1 ? `#${lead.number}` : `${pulls.length} PR`}
  </span>;
}
