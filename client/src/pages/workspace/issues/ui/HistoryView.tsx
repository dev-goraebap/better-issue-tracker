import { Fragment, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { LabelTokens, PersonCell, StatusBadge, type IssueSearch, type WorkItem } from '@/entities/work-item';
import styles from './history.module.css';

const local = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
const dayLabel = (iso: string) => `${local(iso).getMonth() + 1}월 ${local(iso).getDate()}일`;
const monthLabel = (iso: string) => `${local(iso).getFullYear()}년 ${local(iso).getMonth() + 1}월`;
/** The day an issue entered the history: its start when it has one, else the day it was made. */
const dayOf = (issue: WorkItem) => issue.startDate ?? issue.createdAt;

/**
 * The 히스토리 view (D-064's 결정기록 timeline, now a layout any view may take): a history read down the page in a
 * column centred in the card. One line runs unbroken from the first record to the last; each month (the latest first)
 * is a ring on the line with its name and count, each record a dot in its status's colour with its day before the line
 * and its card after: key and title, its status, who it is for and its labels.
 */
export function HistoryView({ workspaceId, items, search, empty }: { workspaceId: string; items: readonly WorkItem[]; search: IssueSearch; empty: ReactNode }) {
  if (items.length === 0) return empty;
  const sorted = [...items].sort((a, b) => dayOf(b).localeCompare(dayOf(a)));
  const groups = [...new Set(sorted.map(issue => monthLabel(dayOf(issue))))].map(name => ({ name, issues: sorted.filter(issue => monthLabel(dayOf(issue)) === name) }));
  return <ol className={styles.timeline} aria-label="히스토리">
    {groups.map(group => <Fragment key={group.name}>
      <li className={styles.group}>
        <span className={styles.ring} aria-hidden="true" />
        <h2 className={styles.groupName}>{group.name}<span className={styles.count}>{group.issues.length}</span></h2>
      </li>
      {group.issues.map(issue => <li key={issue.id} className={styles.entry} data-state={issue.columnCategory ?? 'none'}>
        <span className={styles.when}>{dayLabel(dayOf(issue))}</span>
        <span className={styles.dot} aria-hidden="true" />
        <Link to="/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: issue.projectId, workItemId: issue.id }} search={search} className={styles.card}>
          <span className={styles.cardHead}>
            <span className={styles.key}>{issue.key}</span>
            <span className={styles.title}>{issue.title}</span>
            {issue.columnCategory && <StatusBadge category={issue.columnCategory} />}
          </span>
          <span className={styles.meta}>
            {issue.assigneeId && <span className={styles.person}><PersonCell id={issue.assigneeId} name={issue.assigneeName} /></span>}
            <LabelTokens labels={issue.labels} />
          </span>
        </Link>
      </li>)}
    </Fragment>)}
  </ol>;
}
