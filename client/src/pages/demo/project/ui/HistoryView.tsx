import { Fragment } from 'react';
import { Link } from '@tanstack/react-router';
import { PageState, StatusToken } from '@/shared/ui';
import { DECISION_STATES, LabelTokens, PersonCell, StatusBadge, type Issue, type IssueSearch } from '@/entities/demo-sample';
import { Progress } from './Progress';
import styles from './history.module.css';

const STATE_COLORS = { proposed: 'orange', accepted: 'green', superseded: 'gray' } as const;
const seoul = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000);
const dayLabel = (iso: string) => `${seoul(iso).getUTCMonth() + 1}월 ${seoul(iso).getUTCDate()}일`;
const monthLabel = (iso: string) => `${seoul(iso).getUTCFullYear()}년 ${seoul(iso).getUTCMonth() + 1}월`;
/** The day an issue entered the history: a decision's day, a plan's or a meeting's start, else its last change. */
const dayOf = (issue: Issue) => (issue.startAt ? `${issue.startAt.slice(0, 10)}T00:00:00Z` : issue.updatedAt);
const isWeighing = (issue: Issue) => issue.decision?.state === 'proposed';

/**
 * The 히스토리 view (D-064's 결정기록 timeline, now a layout any view may take): a history read down the page in a
 * column centred in the card. One line runs unbroken from the first record to the last; each group (검토 중 first,
 * then the months, the latest first) is a ring on the line with its name and count, each record a dot in its state's
 * colour (제안 orange, 확정 green, 대체됨 grey; others by their status) with its day before the line and its card after:
 * key and title, its state, who it is for, how far the work it led to has got (a decision's, computed, D-012) and its
 * labels. A superseded record fades but stays.
 */
export function HistoryView({ workspaceId, items, search }: { workspaceId: string; items: readonly Issue[]; search: IssueSearch }) {
  if (items.length === 0) return <PageState title="보일 이슈가 없습니다" description="검색어나 필터를 바꿔 보세요." />;
  const weighing = items.filter(isWeighing);
  const rest = items.filter(issue => !isWeighing(issue)).sort((a, b) => dayOf(b).localeCompare(dayOf(a)));
  const groups = [
    ...(weighing.length > 0 ? [{ name: '검토 중', issues: weighing }] : []),
    ...[...new Set(rest.map(issue => monthLabel(dayOf(issue))))].map(name => ({ name, issues: rest.filter(issue => monthLabel(dayOf(issue)) === name) })),
  ];
  return <ol className={styles.timeline} aria-label="히스토리">
    {groups.map(group => <Fragment key={group.name}>
      <li className={styles.group}>
        <span className={styles.ring} aria-hidden="true" />
        <h2 className={styles.groupName}>{group.name}<span className={styles.count}>{group.issues.length}</span></h2>
      </li>
      {group.issues.map(issue => <li key={issue.id} className={styles.entry} data-state={issue.decision?.state ?? issue.status ?? 'none'}>
        <span className={styles.when}>{isWeighing(issue) ? '' : dayLabel(dayOf(issue))}</span>
        <span className={styles.dot} aria-hidden="true" />
        <Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: issue.projectId, workItemId: issue.id }} search={search} className={styles.card}>
          <span className={styles.cardHead}>
            <span className={styles.key}>{issue.key}</span>
            <span className={styles.title}>{issue.title}</span>
            {issue.decision ? <StatusToken label={DECISION_STATES[issue.decision.state]} color={STATE_COLORS[issue.decision.state]} />
              : issue.status && <StatusBadge status={issue.status} />}
          </span>
          <span className={styles.meta}>
            {issue.assigneeId && <span className={styles.person}><PersonCell id={issue.assigneeId} /></span>}
            {issue.decision && <span className={styles.progress}><span className={styles.metaLabel}>이행</span><Progress value={issue.decision.progress} /></span>}
            <LabelTokens labels={issue.labels} />
          </span>
        </Link>
      </li>)}
    </Fragment>)}
  </ol>;
}
