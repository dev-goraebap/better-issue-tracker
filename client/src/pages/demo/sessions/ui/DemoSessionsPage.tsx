import { AvatarGroup } from '@astryxdesign/core';
import { useParams } from '@tanstack/react-router';
import { DefaultAvatar, ItemList, ItemMeta, ItemRow, ListToolbar, NavIcon, PageFrame, PageState } from '@/shared/ui';
import { dateText, demoStyles, personOf, SESSIONS } from '@/entities/demo-sample';

const TYPE = { meeting: { label: '회의', icon: 'members' }, agent_session: { label: '에이전트 세션', icon: 'agent' } } as const;

/**
 * PATTERN · 행 목록 (세션·회의), /demo/w/$workspaceId/p/$projectId/sessions. Team meetings and agent session summaries in
 * one list, told apart by their kind's mark: the S-number and title, then who took part as a group of pictures, how many
 * decisions came out of it and when. A phone reads the same rows as cards.
 */
export function DemoSessionsPage() {
  const { projectId } = useParams({ from: '/demo/w/$workspaceId/p/$projectId/sessions' });
  const rows = SESSIONS.filter(session => session.projectId === projectId);
  return <PageFrame title="세션·회의" icon="session" chrome="header">
    <ListToolbar label="세션 조건" action={{ label: '세션 기록', icon: 'plus', onClick: () => undefined, isCreate: true }} />
    {rows.length > 0 ? <ItemList label="세션·회의">{rows.map(session => <ItemRow key={session.id}
      lead={<span className={demoStyles.typeMark} title={TYPE[session.type].label}><NavIcon name={TYPE[session.type].icon} /></span>}
      title={<><span className={demoStyles.key}>{session.key}</span> {session.title}</>}
      meta={<>
        <ItemMeta label={`참석 ${session.participantIds.length}명`}><AvatarGroup size={20}>{session.participantIds.map(id => <DefaultAvatar key={id} seed={id} name={personOf(id)?.name} size={20} />)}</AvatarGroup></ItemMeta>
        <ItemMeta width="6rem">{session.decisions > 0 ? `결정 ${session.decisions}개` : <span className={demoStyles.none}>결정 없음</span>}</ItemMeta>
        <ItemMeta width="6rem" align="end">{dateText(session.occurredAt)}</ItemMeta>
      </>} />)}</ItemList>
      : <PageState title="아직 기록된 세션이 없습니다" description="회의록이나 에이전트 세션 요약을 기록하면, 거기서 나온 결정과 작업이 함께 연결됩니다." />}
  </PageFrame>;
}
