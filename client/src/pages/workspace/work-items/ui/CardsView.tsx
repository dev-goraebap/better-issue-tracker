import type { CSSProperties, ReactNode } from 'react';
import { dateText } from '@/shared/lib/date-text';
import { PeopleAvatars, WorkItemLink, type WorkItemSearch, type WorkItem } from '@/entities/work-item';
import styles from './cards.module.css';

/**
 * The 카드 view, Google Keep's board (D-064, now a layout any view may take): cards of their own height packed into
 * columns, each tinted by its first label's colour: the label, the title, a few lines of its description, then who it is
 * for and when it was made. A card opens its work item's page.
 */
export function CardsView({ workspaceId, items, search, empty }: { workspaceId: string; items: readonly WorkItem[]; search: WorkItemSearch; empty: ReactNode }) {
  if (items.length === 0) return empty;
  return <ul className={styles.keep} aria-label="카드">{items.map(workItem => {
    const label = workItem.labels[0];
    return <li key={workItem.id} className={styles.cell}>
      <WorkItemLink workspaceId={workspaceId} item={workItem} search={search} className={styles.card} style={label ? { '--tone': label.color } as CSSProperties : undefined}>
        {label && <span className={styles.label}><span className={styles.dot} aria-hidden="true" />{label.name}{workItem.labels.length > 1 && <span className={styles.more}>+{workItem.labels.length - 1}</span>}</span>}
        <h3 className={styles.title}><span className={styles.key}>{workItem.key}</span>{workItem.title}</h3>
        {workItem.description && <p className={styles.summary}>{workItem.description}</p>}
        <span className={styles.foot}>
          <PeopleAvatars people={workItem.people} />
          <span className={styles.date}>{dateText(workItem.startDate ?? workItem.createdAt)}</span>
        </span>
      </WorkItemLink>
    </li>;
  })}</ul>;
}
