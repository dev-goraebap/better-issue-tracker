import { useState } from 'react';
import { Button, MoreMenu, Text, TextArea, VStack } from '@astryxdesign/core';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { BackLink, ConfirmDialog, DefaultAvatar, ItemList, ItemMeta, ItemRow, NavIcon, PageFrame, PageState, SectionHeader, StatusToken } from '@/shared/ui';
import styles from './detail.module.css';
import { agoText, dateText, DECISION_STATES, issueOf, ISSUES, LabelTokens, PersonCell, personOf, PriorityMark, StatusBadge } from '@/entities/demo-sample';

const STATE_COLORS = { proposed: 'orange', accepted: 'green', superseded: 'gray' } as const;
/** A Seoul wall-clock moment or date as the panel reads it: 10월 23일 14:00. */
const momentText = (value: string) => `${Number(value.slice(5, 7))}월 ${Number(value.slice(8, 10))}일${value.length > 10 ? ` ${value.slice(11, 16)}` : ''}`;

const ACTIVITY = [
  { id: 'e1', actorId: 'a1', text: '상태를 진행 중으로 바꿨습니다', at: '2026-10-23T01:10:00Z' },
  { id: 'e2', actorId: 'u2', text: '응답이 128KiB를 넘으면 잘라서 다음 커서를 주는 쪽이 좋겠습니다. 에이전트가 이어서 읽을 수 있어야 해요.', at: '2026-10-22T07:30:00Z', isComment: true },
  { id: 'e3', actorId: 'u1', text: 'D-056과 연결했습니다', at: '2026-10-21T05:00:00Z' },
  { id: 'e4', actorId: 'u1', text: '작업을 만들었습니다', at: '2026-10-20T02:00:00Z' },
];

/**
 * PATTERN · 상세, /demo/w/$workspaceId/p/$projectId/work-items/$workItemId. Copy this page for one item read on its own address.
 * Every issue opens here, whatever it is (D-066): the page shows the properties it has and leaves out the rest; a
 * 결정기록 adds its state, progress and the alternatives it rejected; a note its participants.
 *
 * - PageFrame back={<BackLink>} marks a detail: the trail names the list it belongs to (BIT 개발 › BIT 코어 › BIT-118), a
 *   phone gives the page the whole screen with '이전으로' in its foot row, and the back goes through history first.
 * - The title is the content here, so it stays visible and wraps (wrapsTitle). The page's actions end the title row:
 *   one labelled button (편집), the rest in the more menu, delete last and always behind ConfirmDialog.
 * - A desktop lays the body and a properties panel side by side; a phone stacks the panel under the body. The panel is
 *   Linear's (D-067): under its quiet heads (속성, 라벨) a 28px line per property, its mark and value with no name column
 *   (the name stays for assistive technology), an unset one in the quiet ink.
 * - Sections (설명, 연결, 활동) are SectionHeader over their content; a missing item is a not-found PageState.
 */
export function DemoDetailPage() {
  const { workspaceId, projectId, workItemId: id } = useParams({ from: '/demo/w/$workspaceId/p/$projectId/work-items/$workItemId' });
  const search = useSearch({ from: '/demo/w/$workspaceId/p/$projectId/work-items/$workItemId' });
  const list = { to: '/demo/w/$workspaceId/p/$projectId', params: { workspaceId, projectId }, search } as const;
  const navigate = useNavigate();
  const [isDeleting, setDeleting] = useState(false);
  const [comment, setComment] = useState('');
  const found = issueOf(id);
  const item = found?.projectId === projectId ? found : undefined;
  const back = <BackLink {...list} label="이슈" />;
  if (!item) return <PageFrame title="이슈를 찾을 수 없습니다" back={back}>
    <PageState kind="not-found" title="이슈를 찾을 수 없습니다" description="지워졌거나 주소가 바뀌었습니다. 목록에서 다시 찾아보세요." />
  </PageFrame>;
  const decision = ISSUES.find(each => each.decision && each.projectId === item.projectId && each.id !== item.id);
  const note = ISSUES.find(each => each.labels.includes('회의록') && each.projectId === item.projectId && each.id !== item.id);
  // Only the properties the issue has; 기한 offers itself on an issue that moves along the workflow.
  const properties: [string, React.ReactNode][] = [
    ...(item.status ? [['상태', <StatusBadge status={item.status} />] as [string, React.ReactNode]] : []),
    ...(item.priority ? [['우선순위', <PriorityMark priority={item.priority} />] as [string, React.ReactNode]] : []),
    ...(item.assigneeId || item.status ? [['담당자', <span className={styles.person}><PersonCell id={item.assigneeId} /></span>] as [string, React.ReactNode]] : []),
    ...(item.startAt ? [['일시', <span className={styles.dated}><NavIcon name="clock" />{momentText(item.startAt)}{item.endAt && item.endAt !== item.startAt ? ` – ${momentText(item.endAt).replace(/^\d+월 \d+일 (?=\d)/, item.endAt.slice(0, 10) === item.startAt.slice(0, 10) ? '' : '$&')}` : ''}</span>] as [string, React.ReactNode]] : []),
    ...(item.dueAt || item.status ? [['기한', <span className={styles.dated} data-empty={!item.dueAt || undefined}><NavIcon name="calendar" />{item.dueAt ? dateText(item.dueAt) : '기한 정하기'}</span>] as [string, React.ReactNode]] : []),
    ['만든 날', <span className={styles.dated}><NavIcon name="clock" />{dateText(item.createdAt)} 만듦</span>],
  ];
  return <PageFrame title={item.title} wrapsTitle back={back} actions={<>
    <Button label="편집" variant="secondary" icon={<NavIcon name="edit" />} onClick={() => void navigate({ to: '/demo/w/$workspaceId/p/$projectId/work-items/new', params: { workspaceId, projectId } })} />
    <MoreMenu label="이슈 메뉴" variant="ghost" placement="end" items={[
      { label: '링크 복사', icon: <NavIcon name="link" />, onClick: () => void navigator.clipboard?.writeText(window.location.href) },
      { label: '삭제', icon: <NavIcon name="delete" />, onClick: () => setDeleting(true) },
    ]} />
  </>}>
    <div className={styles.layout}>
      <VStack gap={8} className={styles.main}>
        <section aria-labelledby="detail-body">
          <SectionHeader id="detail-body" title="설명" />
          <div className={styles.prose}>
            {item.summary ? <p>{item.summary}</p> : <><p>MCP <code>get_context</code> 도구가 큰 프로젝트에서 수 MB의 응답을 돌려줘 에이전트의 맥락 창을 넘깁니다.</p>
            <p>응답을 128KiB 이하로 자르고, 이어 읽을 커서를 함께 돌려줍니다. 결정·세션 요약은 본문 대신 제목과 링크만 담습니다.</p>
            <ul><li>잘린 응답에 <code>nextCursor</code> 포함</li><li>본문 전체가 필요하면 개별 조회 도구 사용</li></ul></>}
          </div>
        </section>
        {item.decision && <section aria-labelledby="detail-decision">
          <SectionHeader id="detail-decision" title="결정" />
          <div className={styles.decision}>
            <StatusToken label={DECISION_STATES[item.decision.state]} color={STATE_COLORS[item.decision.state]} />
            <span className={styles.decisionProgress}>이행 {item.decision.progress[0]}/{item.decision.progress[1]}</span>
          </div>
          {item.decision.rejected.length > 0 && <>
            <h3 className={styles.subhead}>기각한 대안</h3>
            <ul className={styles.rejected}>{item.decision.rejected.map(alternative => <li key={alternative}>{alternative}</li>)}</ul>
          </>}
        </section>}
        {item.participantIds && item.participantIds.length > 0 && <section aria-labelledby="detail-people">
          <SectionHeader id="detail-people" title="참석자" />
          <ul className={styles.people}>{item.participantIds.map(personId => <li key={personId}><PersonCell id={personId} /></li>)}</ul>
        </section>}
        <section aria-labelledby="detail-links">
          <SectionHeader id="detail-links" title="연결" actions={<Button label="연결 추가" variant="ghost" size="sm" icon={<NavIcon name="plus" />} />} />
          <ItemList label="연결된 항목">
            {decision && <ItemRow lead={<><NavIcon name="decision" /><span className={styles.key}>{decision.key}</span></>} title={decision.title} meta={<ItemMeta>도출 근거</ItemMeta>} />}
            {note && <ItemRow lead={<><NavIcon name="session" /><span className={styles.key}>{note.key}</span></>} title={note.title} meta={<ItemMeta>관련</ItemMeta>} />}
          </ItemList>
        </section>
        <section aria-labelledby="detail-activity">
          <SectionHeader id="detail-activity" title="활동" />
          <ol className={styles.activity}>{ACTIVITY.map(event => {
            const actor = personOf(event.actorId);
            return <li key={event.id} className={styles.event} data-comment={event.isComment || undefined}>
              <DefaultAvatar seed={event.actorId} name={actor?.name} size={24} />
              <div className={styles.eventBody}>
                <Text type="supporting"><strong>{actor?.name}</strong>{actor?.kind === 'agent' && <span className={styles.agent}>에이전트</span>} · {agoText(event.at)}</Text>
                <Text>{event.text}</Text>
              </div>
            </li>;
          })}</ol>
          <div className={styles.comment}>
            <TextArea label="댓글" isLabelHidden placeholder="댓글을 남기세요" value={comment} onChange={setComment} rows={2} />
            <span className={styles.commentAction}><Button label="댓글 남기기" variant="primary" size="sm" isDisabled={!comment.trim()} onClick={() => setComment('')} /></span>
          </div>
        </section>
      </VStack>
      <aside className={styles.aside} aria-label="속성">
        <h2 className={styles.asideHead}>속성</h2>
        <dl className={styles.properties}>{properties.map(([label, value]) => <div key={label} className={styles.property}>
          <dt className={styles.spoken}>{label}</dt><dd>{value}</dd>
        </div>)}</dl>
        <h2 className={styles.asideHead}>라벨</h2>
        <div className={styles.asideLabels}><LabelTokens labels={item.labels} /></div>
      </aside>
    </div>
    {isDeleting && <ConfirmDialog title="이슈를 삭제할까요?" description={`${item.key} ${item.title}을(를) 삭제합니다. 연결과 댓글은 기록으로 남습니다.`}
      confirmLabel="삭제" variant="destructive" onClose={() => setDeleting(false)} onConfirm={() => { setDeleting(false); void navigate(list); }} />}
  </PageFrame>;
}
