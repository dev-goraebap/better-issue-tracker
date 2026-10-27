import { agoText } from '@/shared/lib/date-text';
import { NavIcon, Timeline, TimelineItem } from '@/shared/ui';
import type { CodeLink } from '../api/repository';
import { ProviderMark } from './ProviderMark';
import styles from './repository.module.css';

const STATE_LABEL: Record<CodeLink['state'], string> = { open: '열림', draft: '초안', merged: '병합됨', closed: '닫힘' };
const KIND_LABEL: Record<CodeLink['kind'], string> = { issue: '이슈', pull_request: 'PR', branch: '브랜치', commit: '커밋' };

/** A pull request's icon by its state, as GitHub draws them. */
const pullIcon = (state: CodeLink['state']) => (state === 'merged' ? 'merge' : state === 'draft' ? 'pull-request-draft' : state === 'closed' ? 'pull-request-closed' : 'pull-request');

/**
 * What in the repositories an issue is tied to (D-087), on the same rule and in the same rhythm as its 활동 (BIT-84):
 * the repository's issue it is mirrored with, its pull requests in their state's colour, its branches (a branch whose
 * pull request is listed is left out) and the commits naming it, in the order they last moved, oldest first. Each line
 * says what it is, who and when, and opens on the host in a new tab.
 */
export function CodeLinkList({ links }: { links: readonly CodeLink[] }) {
  const pullBranches = new Set(links.filter(link => link.kind === 'pull_request').map(link => link.detail));
  const shown = links
    .filter(link => !(link.kind === 'branch' && pullBranches.has(link.externalId)))
    .slice().sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return <Timeline label="연결된 코드">
    {shown.map(link => <TimelineItem key={link.id} tone={link.kind === 'pull_request' ? link.state : undefined}
      mark={link.kind === 'issue' ? <ProviderMark provider={link.provider} /> : <NavIcon name={link.kind === 'pull_request' ? pullIcon(link.state) : link.kind === 'branch' ? 'branch' : 'commit'} />}>
      <a className={styles.link} href={link.url} target="_blank" rel="noreferrer noopener">
        <span className={styles.linkText}>
          <span className={styles.kind}>{KIND_LABEL[link.kind]}</span>
          {link.kind === 'commit' ? <><code className={styles.sha}>{link.externalId.slice(0, 7)}</code><span className={styles.title}>{link.title}</span></>
            : link.kind === 'branch' ? <code className={styles.branch}>{link.externalId}</code>
            : <><span className={styles.number}>#{link.externalId}</span><span className={styles.title}>{link.title}</span></>}
        </span>
        {link.kind === 'pull_request' && <span className={styles.state} data-state={link.state}>{STATE_LABEL[link.state]}</span>}
        <span className={styles.meta}>
          {link.author && <>{link.author} · </>}
          <time dateTime={link.updatedAt} title={new Date(link.updatedAt).toLocaleString('ko-KR')}>{agoText(link.updatedAt)}</time>
        </span>
        <span className={styles.external}><NavIcon name="external" /></span>
      </a>
    </TimelineItem>)}
  </Timeline>;
}
