import type { CSSProperties } from 'react';
import { AvatarGroup } from '@astryxdesign/core';
import { Link } from '@tanstack/react-router';
import { DefaultAvatar, NavIcon, PageState } from '@/shared/ui';
import { dateText, LABEL_COLORS, personOf, type Issue, type IssueSearch } from '@/entities/demo-sample';
import styles from './cards.module.css';

/** When an issue happened or was made, for its card's foot. */
const when = (issue: Issue) => (issue.startAt ? `${Number(issue.startAt.slice(5, 7))}월 ${Number(issue.startAt.slice(8, 10))}일` : dateText(issue.createdAt));

/**
 * The 카드 view, Google Keep's board (D-064, now a layout any view may take): cards of their own height packed into
 * columns, each tinted by its first label's colour: the label, the title, a few lines of what was said, then who took
 * part (or who it is for), how many comments and when. A card opens its issue's page.
 */
export function CardsView({ workspaceId, items, search }: { workspaceId: string; items: readonly Issue[]; search: IssueSearch }) {
  if (items.length === 0) return <PageState title="보일 이슈가 없습니다" description="검색어나 필터를 바꿔 보세요." />;
  return <ul className={styles.keep} aria-label="카드">{items.map(issue => {
    const people = issue.participantIds ?? (issue.assigneeId ? [issue.assigneeId] : []);
    const label = issue.labels[0];
    return <li key={issue.id} className={styles.cell}>
      <Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: issue.projectId, workItemId: issue.id }} search={search}
        className={styles.card} style={{ '--tone': label ? LABEL_COLORS[label] ?? '#95959f' : '#95959f' } as CSSProperties}>
        {label && <span className={styles.label}><span className={styles.dot} aria-hidden="true" />{label}{issue.labels.length > 1 && <span className={styles.more}>+{issue.labels.length - 1}</span>}</span>}
        <h3 className={styles.title}><span className={styles.key}>{issue.key}</span>{issue.title}</h3>
        {issue.summary && <p className={styles.summary}>{issue.summary}</p>}
        <span className={styles.foot}>
          {people.length > 0 && <AvatarGroup size={20}>{people.map(id => <DefaultAvatar key={id} seed={id} name={personOf(id)?.name} size={20} />)}</AvatarGroup>}
          {issue.comments > 0 && <span className={styles.comments}><NavIcon name="comment" />{issue.comments}</span>}
          <span className={styles.date}>{when(issue)}</span>
        </span>
      </Link>
    </li>;
  })}</ul>;
}
