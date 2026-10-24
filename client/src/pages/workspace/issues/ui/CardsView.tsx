import type { CSSProperties, ReactNode } from 'react';
import { DefaultAvatar } from '@/shared/ui';
import { dateText } from '@/shared/lib/date-text';
import { IssueLink, type IssueSearch, type WorkItem } from '@/entities/work-item';
import styles from './cards.module.css';

/**
 * The 카드 view, Google Keep's board (D-064, now a layout any view may take): cards of their own height packed into
 * columns, each tinted by its first label's colour: the label, the title, a few lines of its description, then who it is
 * for and when it was made. A card opens its issue's page.
 */
export function CardsView({ workspaceId, items, search, empty }: { workspaceId: string; items: readonly WorkItem[]; search: IssueSearch; empty: ReactNode }) {
  if (items.length === 0) return empty;
  return <ul className={styles.keep} aria-label="카드">{items.map(issue => {
    const label = issue.labels[0];
    return <li key={issue.id} className={styles.cell}>
      <IssueLink workspaceId={workspaceId} item={issue} search={search} className={styles.card} style={label ? { '--tone': label.color } as CSSProperties : undefined}>
        {label && <span className={styles.label}><span className={styles.dot} aria-hidden="true" />{label.name}{issue.labels.length > 1 && <span className={styles.more}>+{issue.labels.length - 1}</span>}</span>}
        <h3 className={styles.title}><span className={styles.key}>{issue.key}</span>{issue.title}</h3>
        {issue.description && <p className={styles.summary}>{issue.description}</p>}
        <span className={styles.foot}>
          {issue.assigneeId && <DefaultAvatar seed={issue.assigneeId} name={issue.assigneeName ?? ''} size={20} />}
          <span className={styles.date}>{dateText(issue.startDate ?? issue.createdAt)}</span>
        </span>
      </IssueLink>
    </li>;
  })}</ul>;
}
