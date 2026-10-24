import { useCallback, useId, useMemo, useState } from 'react';
import { MoreMenu, Token } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { DefaultAvatar, ItemList, ItemMeta, ItemRow, ListToolbar, NavIcon, PageFrame, PageState, PageTabs, Select, SheetTable, StatusToken, type PageTab, type SheetColumn } from '@/shared/ui';
import {
  agoText, dateText, DECISIONS, demoStyles, INVITATIONS, PEOPLE, personOf, projectsIn, ROLE_LABELS, SESSIONS, WORK_ITEMS, type Invitation, type MembersSearch, type Person, type Role,
} from '@/entities/demo-sample';
import styles from './members.module.css';

type Tab = 'members' | 'invitations';
const TABS: PageTab<Tab>[] = [{ value: 'members', label: '구성원', icon: 'members' }, { value: 'invitations', label: '초대', icon: 'mail' }];
const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[]).map(role => ({ value: role, label: ROLE_LABELS[role] }));

/**
 * PATTERN · 탭마다 다른 리스트 (구성원), /demo/w/$workspaceId/members (as the real /members?view=invitations). Copy this page
 * when one menu holds a few lists of different shapes.
 *
 * - The tab is the URL's view (구성원 left out); each tab has its own columns and its own action (초대 탭: 구성원 초대).
 * - 구성원 is a list (a table on a desktop, D-064): the person (picture, name, email), their role (a select), the
 *   projects they take part in, what they have done here (작업·결정기록·노트) and when they were last active.
 * - A row's control (역할 선택, 행 메뉴) sits in its cell; pressing it never opens the row.
 * - A phone shows the same rows as cards: the picture as the lead, the name over the email, the role and how many
 *   projects at the end.
 */
export function DemoMembersPage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/members' });
  const search = useSearch({ from: '/demo/w/$workspaceId/members' });
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const navigate = useNavigate();
  const panelId = useId();
  const tab: Tab = search.view ?? 'members';
  const [roles, setRoles] = useState<Record<string, Role>>(() => Object.fromEntries(PEOPLE.filter(person => person.role).map(person => [person.id, person.role as Role])));
  const go = useCallback((patch: Partial<MembersSearch>, replace = false) => void navigate({
    to: '/demo/w/$workspaceId/members', params: { workspaceId }, replace,
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId]);
  const members = useMemo(() => PEOPLE.filter(person => person.kind === 'user')
    .filter(person => !search.q || person.name.includes(search.q) || person.email?.includes(search.q)), [search.q]);
  // What each person has done in this workspace: the projects they lead or work in, their counts and their last day.
  const projects = projectsIn(workspaceId);
  const inHere = (projectId: string) => projects.some(project => project.id === projectId);
  const takePart = (person: Person) => {
    const work = WORK_ITEMS.filter(item => inHere(item.projectId) && item.assigneeId === person.id);
    const decisions = DECISIONS.filter(decision => inHere(decision.projectId) && decision.ownerId === person.id);
    const notes = SESSIONS.filter(session => inHere(session.projectId) && session.participantIds.includes(person.id));
    const joined = projects.filter(project => project.status === 'active' && (project.leadId === person.id || work.some(item => item.projectId === project.id)));
    const last = [...work.map(item => item.updatedAt), ...decisions.flatMap(decision => (decision.decidedAt ? [decision.decidedAt] : [])), ...notes.map(note => note.occurredAt)].sort().pop();
    return { work: work.length, decisions: decisions.length, notes: notes.length, joined, last };
  };
  const roleSelect = (person: Person) => <Select label={`${person.name} 역할`} isLabelHidden size="sm" options={ROLE_OPTIONS} value={roles[person.id]}
    onChange={value => setRoles({ ...roles, [person.id]: (value ?? 'member') as Role })} />;
  // Built each render: the role cell reads the roles in state.
  const memberColumns: SheetColumn<Person>[] = [
    { key: 'name', header: '이름', render: row => <span className={styles.person}><DefaultAvatar seed={row.id} name={row.name} size={32} />
      <span className={styles.personText}><span className={styles.personName}>{row.name}</span><span className={styles.personEmail}>{row.email}</span></span></span> },
    { key: 'role', header: '역할', width: '9rem', render: roleSelect },
    { key: 'projects', header: '프로젝트', width: '13rem', render: row => {
      const joined = takePart(row).joined;
      return joined.length ? <span className={styles.projects}>{joined.map(project => <Token key={project.id} size="sm" label={project.name} />)}</span> : <span className={demoStyles.none}>없음</span>;
    } },
    { key: 'part', header: '참여', width: '12rem', render: row => { const part = takePart(row); return <span className={styles.part}>작업 {part.work} · 결정기록 {part.decisions} · 노트 {part.notes}</span>; } },
    { key: 'last', header: '최근 활동', width: '7rem', align: 'end', render: row => { const last = takePart(row).last; return last ? agoText(last) : <span className={demoStyles.none}>-</span>; } },
  ];
  const inviteColumns = useMemo<SheetColumn<Invitation>[]>(() => [
    { key: 'email', header: '이메일', render: row => <span className={demoStyles.clip}>{row.email}</span> },
    { key: 'role', header: '역할', width: '7rem', render: row => ROLE_LABELS[row.role] },
    { key: 'by', header: '보낸 사람', width: '8rem', render: row => personOf(row.invitedById)?.name },
    { key: 'status', header: '상태', width: '6rem', render: row => <StatusToken label={row.status === 'pending' ? '대기' : '만료'} color={row.status === 'pending' ? 'blue' : 'gray'} /> },
    { key: 'expires', header: '만료일', width: '7rem', render: row => dateText(row.expiresAt) },
    { key: 'menu', header: '', width: '3.5rem', align: 'end', render: row => <MoreMenu label={`${row.email} 초대 메뉴`} variant="ghost" size="sm" placement="end" items={[
      { label: '다시 보내기', icon: <NavIcon name="mail" />, onClick: () => undefined },
      { label: '초대 취소', icon: <NavIcon name="delete" />, onClick: () => undefined },
    ]} /> },
  ], []);
  return <PageFrame title="구성원" icon="members" chrome="header"
    tabs={<PageTabs value={tab} items={TABS} panelId={panelId} onChange={next => go({ view: next === 'members' ? undefined : 'invitations' })} />}>
    <ListToolbar search={tab === 'members' ? { label: '구성원 검색', placeholder: '이름이나 이메일로 찾기', value: search.q, onChange: q => go({ q }, true) } : undefined}
      label="초대 조건" action={tab === 'invitations' ? { label: '구성원 초대', icon: 'plus', onClick: () => undefined, isCreate: true } : undefined} />
    <div role="tabpanel" id={panelId}>
      {tab === 'members' && (members.length === 0
        ? <PageState kind="search" title={`'${search.q}'에 맞는 구성원이 없습니다`} description="다른 이름이나 이메일로 찾아보세요." />
        : isMobile
          ? <ItemList label="구성원">{members.map(person => <ItemRow key={person.id} lead={<DefaultAvatar seed={person.id} name={person.name} size={32} />}
            title={<span className={styles.personText}><span className={styles.personName}>{person.name}</span><span className={styles.personEmail}>{person.email}</span></span>}
            meta={<><ItemMeta>{ROLE_LABELS[roles[person.id]]}</ItemMeta><ItemMeta>프로젝트 {takePart(person).joined.length}</ItemMeta></>} />)}</ItemList>
          : <SheetTable label="구성원" columns={memberColumns} rows={members} rowKey={row => row.id} minWidth="56rem" />)}
      {tab === 'invitations' && (isMobile
        ? <ItemList label="초대">{INVITATIONS.map(invite => <ItemRow key={invite.id} title={invite.email}
          meta={<><ItemMeta>{ROLE_LABELS[invite.role]}</ItemMeta><ItemMeta><StatusToken label={invite.status === 'pending' ? '대기' : '만료'} color={invite.status === 'pending' ? 'blue' : 'gray'} /></ItemMeta><ItemMeta>{dateText(invite.expiresAt)}</ItemMeta></>} />)}</ItemList>
        : <SheetTable label="초대" columns={inviteColumns} rows={INVITATIONS} rowKey={row => row.id} minWidth="44rem" />)}
    </div>
  </PageFrame>;
}
