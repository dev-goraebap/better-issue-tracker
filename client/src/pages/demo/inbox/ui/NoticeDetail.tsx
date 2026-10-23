import { Button, Text, VStack } from '@astryxdesign/core';
import { useNavigate } from '@tanstack/react-router';
import { DefaultAvatar, NavIcon, SectionHeader } from '@/shared/ui';
import { agoText, DECISIONS, itemOf, markUnread, type Notice, PersonCell, personOf, PriorityMark, SESSIONS, StatusBadge } from '@/entities/demo-sample';
import styles from './inbox.module.css';

const TYPE = { work_item: { icon: 'tasks', label: '작업' }, decision: { icon: 'decision', label: '결정' }, session: { icon: 'session', label: '세션·회의' } } as const;
const DECISION_STATUS = { proposed: '제안', accepted: '확정', superseded: '대체됨' } as const;

/**
 * One notice opened: who did what and when, the words that raised it (the comment that mentioned the member, the reason
 * given) as a quote, and what it is about as a summary card with its own state (a work item's status, priority and
 * assignee; a decision's state and progress; a session's participants), so most notices are dealt with here. The main
 * action opens the target; 읽지 않음으로 puts the notice back.
 */
export function NoticeDetail({ workspaceId, notice, isTitleShown = true }: {
  workspaceId: string; notice: Notice;
  /** False when the page's own title already says what happened (a phone's notice page). */
  isTitleShown?: boolean;
}) {
  const navigate = useNavigate();
  const actor = personOf(notice.actorId);
  const { target } = notice;
  const item = target.type === 'work_item' ? itemOf(target.id) : undefined;
  const decision = target.type === 'decision' ? DECISIONS.find(each => each.id === target.id) : undefined;
  const session = target.type === 'session' ? SESSIONS.find(each => each.id === target.id) : undefined;
  const open = () => {
    if (item) void navigate({ to: '/demo/w/$workspaceId/p/$projectId/work-items/$workItemId', params: { workspaceId, projectId: item.projectId, workItemId: item.id } });
    else if (decision) void navigate({ to: '/demo/w/$workspaceId/p/$projectId/decisions', params: { workspaceId, projectId: decision.projectId } });
    else void navigate({ to: '/demo/w/$workspaceId/p/$projectId/sessions', params: { workspaceId, projectId: target.projectId } });
  };
  return <article className={styles.detail} aria-label={notice.title}>
    <header className={styles.detailHead}>
      <DefaultAvatar seed={notice.actorId} name={actor?.name} size={40} />
      <VStack gap={0}>
        {isTitleShown && <Text weight="semibold" className={styles.detailTitle}>{notice.title}</Text>}
        <Text type="supporting" color="secondary">{actor?.name}{actor?.kind === 'agent' ? ' · 에이전트' : ''} · {agoText(notice.at)}</Text>
      </VStack>
    </header>
    {notice.quote && <blockquote className={styles.quote}>{notice.quote}</blockquote>}
    <section aria-labelledby={`notice-${notice.id}-target`}>
      <SectionHeader id={`notice-${notice.id}-target`} title={`관련 ${TYPE[target.type].label}`} />
      <div className={styles.target}>
        <div className={styles.targetHead}><NavIcon name={TYPE[target.type].icon} /><span className={styles.key}>{target.key}</span><Text weight="semibold">{target.title}</Text></div>
        {item && <dl className={styles.targetProps}>
          <div><dt>상태</dt><dd><StatusBadge status={item.status} /></dd></div>
          <div><dt>우선순위</dt><dd><PriorityMark priority={item.priority} /></dd></div>
          <div><dt>담당자</dt><dd><PersonCell id={item.assigneeId} /></dd></div>
        </dl>}
        {decision && <dl className={styles.targetProps}>
          <div><dt>상태</dt><dd>{DECISION_STATUS[decision.status]}</dd></div>
          <div><dt>이행</dt><dd>{decision.progress[1] ? `${decision.progress[0]}/${decision.progress[1]}` : '해당 없음'}</dd></div>
        </dl>}
        {session && <dl className={styles.targetProps}>
          <div><dt>참석</dt><dd>{session.participantIds.map(id => personOf(id)?.name).join(', ')}</dd></div>
          <div><dt>도출 결정</dt><dd>{session.decisions}개</dd></div>
        </dl>}
      </div>
    </section>
    <footer className={styles.detailActions}>
      <Button label={`${TYPE[target.type].label} 열기`} variant="primary" icon={<NavIcon name="next" />} onClick={open} />
      <Button label="읽지 않음으로" variant="ghost" onClick={() => markUnread(notice.id)} />
    </footer>
  </article>;
}
