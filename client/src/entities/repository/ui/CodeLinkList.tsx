import { NavIcon } from '@/shared/ui';
import type { CodeLink } from '../api/repository';
import { ProviderMark } from './ProviderMark';
import styles from './repository.module.css';

const STATE_LABEL: Record<CodeLink['state'], string> = { open: '열림', draft: '초안', merged: '병합됨', closed: '닫힘' };

/** A pull request's icon by its state, as GitHub draws them. */
const pullIcon = (state: CodeLink['state']) => (state === 'merged' ? 'merge' : state === 'draft' ? 'pull-request-draft' : state === 'closed' ? 'pull-request-closed' : 'pull-request');

/**
 * What in the repositories an issue is tied to, as Kaneo's Resources (D-087): the repository's issue it is mirrored
 * with, its pull requests with their state, its branches (a branch whose pull request is listed is left out) and the
 * commits naming it, newest first. Each opens on the host in a new tab.
 */
export function CodeLinkList({ links }: { links: readonly CodeLink[] }) {
  const pullBranches = new Set(links.filter(link => link.kind === 'pull_request').map(link => link.detail));
  const order = { issue: 0, pull_request: 1, branch: 2, commit: 3 } as const;
  const shown = links
    .filter(link => !(link.kind === 'branch' && pullBranches.has(link.externalId)))
    .slice().sort((a, b) => order[a.kind] - order[b.kind]);
  return <ul className={styles.links}>
    {shown.map(link => <li key={link.id}>
      <a className={styles.link} href={link.url} target="_blank" rel="noreferrer noopener">
        <span className={styles.linkIcon} data-state={link.kind === 'pull_request' ? link.state : undefined}>
          {link.kind === 'issue' ? <ProviderMark provider={link.provider} /> : <NavIcon name={link.kind === 'pull_request' ? pullIcon(link.state) : link.kind === 'branch' ? 'branch' : 'commit'} />}
        </span>
        <span className={styles.linkText}>
          {link.kind === 'commit' ? <><code className={styles.sha}>{link.externalId.slice(0, 7)}</code>{link.title}</>
            : link.kind === 'branch' ? <code className={styles.branch}>{link.externalId}</code>
            : <><span className={styles.number}>#{link.externalId}</span>{link.title}</>}
        </span>
        {link.kind === 'pull_request' && <span className={styles.state} data-state={link.state}>{STATE_LABEL[link.state]}</span>}
        <span className={styles.external}><NavIcon name="external" /></span>
      </a>
    </li>)}
  </ul>;
}
