import { useQuery } from '@tanstack/react-query';
import { codeLinksQuery } from '@/entities/repository';
import { WorkItemLink } from '@/entities/work-item';
import type { DocumentDetail } from '@/entities/document';
import styles from './document.module.css';

/**
 * A work item the document is linked to, with that work item's latest commits (D-093: a document's commits are its
 * work items'), three at most.
 */
export function LinkedWorkItem({ workspaceId, item }: { workspaceId: string; item: DocumentDetail['workItems'][number] }) {
  const commits = (useQuery(codeLinksQuery(workspaceId, item.projectId, item.id)).data ?? [])
    .filter(link => link.kind === 'commit')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  return <li className={styles.item}>
    <WorkItemLink workspaceId={workspaceId} item={item}><span className={styles.key}>{item.reference}</span>{item.title}</WorkItemLink>
    {commits.map(commit => <a key={commit.id} className={styles.commit} href={commit.url} target="_blank" rel="noreferrer">
      <code>{commit.externalId.slice(0, 7)}</code><span>{commit.title}</span>
    </a>)}
  </li>;
}
