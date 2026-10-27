import { Fragment, type ReactNode } from 'react';
import { dateText, monthText } from '@/shared/lib/date-text';
import { WorkItemLink, LabelTokens, PersonCell, StatusBadge, type WorkItemSearch, type WorkItem } from '@/entities/work-item';
import styles from './history.module.css';

/** The day a work item entered the history: its start when it has one, else the day it was made. */
const dayOf = (workItem: WorkItem) => workItem.startDate ?? workItem.createdAt;

/**
 * The 히스토리 view (D-064's 결정기록 timeline, now a layout any view may take): a history read down the page in a
 * column centred in the card. One line runs unbroken from the first record to the last; each month (the latest first)
 * is a ring on the line with its name and count, each record a dot in its status's colour with its day before the line
 * and its card after: key and title, its status, who it is for and its labels.
 */
export function HistoryView({ workspaceId, items, search, empty }: { workspaceId: string; items: readonly WorkItem[]; search: WorkItemSearch; empty: ReactNode }) {
  if (items.length === 0) return empty;
  const sorted = [...items].sort((a, b) => dayOf(b).localeCompare(dayOf(a)));
  const groups = [...new Set(sorted.map(workItem => monthText(dayOf(workItem))))].map(name => ({ name, workItems: sorted.filter(workItem => monthText(dayOf(workItem)) === name) }));
  return <ol className={styles.timeline} aria-label="히스토리">
    {groups.map(group => <Fragment key={group.name}>
      <li className={styles.group}>
        <span className={styles.ring} aria-hidden="true" />
        <h2 className={styles.groupName}>{group.name}<span className={styles.count}>{group.workItems.length}</span></h2>
      </li>
      {group.workItems.map(workItem => <li key={workItem.id} className={styles.entry} data-state={workItem.columnCategory ?? 'none'}>
        <span className={styles.when}>{dateText(dayOf(workItem))}</span>
        <span className={styles.dot} aria-hidden="true" />
        <WorkItemLink workspaceId={workspaceId} item={workItem} search={search} className={styles.card}>
          <span className={styles.cardHead}>
            <span className={styles.key}>{workItem.key}</span>
            <span className={styles.title}>{workItem.title}</span>
            {workItem.columnCategory && <StatusBadge category={workItem.columnCategory} />}
          </span>
          <span className={styles.meta}>
            {workItem.people.length > 0 && <span className={styles.person}><PersonCell people={workItem.people} /></span>}
            <LabelTokens labels={workItem.labels} />
          </span>
        </WorkItemLink>
      </li>)}
    </Fragment>)}
  </ol>;
}
