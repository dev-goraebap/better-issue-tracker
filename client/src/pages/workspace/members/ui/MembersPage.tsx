import { useCallback, useId, useState } from 'react';
import { MoreMenu } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { authError, sessionQueryOptions } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import {
  ConfirmDialog, DefaultAvatar, ItemList, ItemMeta, ItemRow, ListSummary, ListToolbar, NavIcon, PageFrame, PageState, PageTabs, QueryMessage, Select, SheetTable, StatusToken,
  type ListFilter, type ListSort, type PageTab, type SheetColumn, type SortKey,
} from '@/shared/ui';
import {
  canManage, changeRole, forgetWorkspace, invitationsQuery, leaveWorkspace, refreshWorkspace, removeMember, revokeInvitation, ROLE_LABELS, ROLES, useMembers, workspaceQuery,
  type Invitation, type Member, type Role,
} from '@/entities/workspace';
import { ProjectMark, projectMembershipsQuery, projectsQuery } from '@/entities/project';
import type { MembersSearch } from '../model/search';
import { MemberProjectsDialog } from './MemberProjectsDialog';
import styles from './members.module.css';

type Tab = 'members' | 'invitations';
const STATUS_TOKENS: Record<string, { label: string; color: 'blue' | 'green' | 'gray' | 'red' }> = {
  pending: { label: '대기', color: 'blue' }, accepted: { label: '수락', color: 'green' }, expired: { label: '만료', color: 'gray' }, revoked: { label: '폐기', color: 'red' },
};
type Pending = { kind: 'role'; member: Member; role: Role } | { kind: 'remove'; member: Member } | { kind: 'leave'; member: Member } | { kind: 'revoke'; invite: Invitation };
/** The orders 구성원 offers; the usual one is by when they joined, the earliest first. */
const SORT_KEYS: readonly SortKey[] = [
  { value: 'joined', label: '참여한 날', kind: 'date' }, { value: 'name', label: '이름', kind: 'text' }, { value: 'role', label: '역할', kind: 'rank' },
];
const USUAL_ORDER = { key: 'joined', direction: 'asc' } as const;
const roleRank = (role: Role) => ROLES.indexOf(role);

/**
 * PATTERN · 탭마다 다른 리스트 (구성원), /workspaces/$workspaceId/members (?view=invitations). One menu holding two lists of
 * different shapes.
 *
 * - The tab is the URL's view (구성원 left out); 초대 shows to the workspace's owner and admins only. They also get
 *   구성원 초대 (its own page of rows, D-079, each a one-time link to hand over) on both tabs.
 * - 구성원 is a list (a table on a desktop, D-064): the person (picture, name, email), their role (a select for those
 *   the member may change: the owner changes anyone but the owner, an admin changes members and viewers), when they
 *   joined, the projects they belong to (D-075: marks and the first one's name, opening the member's projects, where
 *   those who manage members add them to projects or take them off), and a row menu: 구성원에서 제거 for those one may change, 워크스페이스에서 나가기 on one's own row (not the
 *   owner's). Every change asks first. It narrows by role, orders by when they joined, name or role (the address keeps
 *   both), and ends in the count line every list has. A phone shows the same rows as cards. Members are managed here
 *   and nowhere else; the workspace's settings only explain the roles.
 * - 초대 lists the invitations with their state; a pending one can be revoked from its row menu.
 */
export function MembersPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const search = useSearch({ strict: false }) as MembersSearch;
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const navigate = useNavigate();
  const client = useQueryClient();
  const panelId = useId();
  const me = useQuery(sessionQueryOptions).data?.user.id;
  const myRole = useQuery(workspaceQuery(workspaceId)).data?.myRole ?? 'viewer';
  const isManager = canManage(myRole);
  const tab: Tab = isManager && search.view === 'invitations' ? 'invitations' : 'members';
  const people = useMembers(workspaceId);
  const invitations = useQuery({ ...invitationsQuery(workspaceId), enabled: tab === 'invitations' });
  const [pending, setPending] = useState<Pending | null>(null);
  const [projectsOf, setProjectsOf] = useState<Member | null>(null);
  const projectPages = useInfiniteQuery(projectsQuery(workspaceId));
  const projects = projectPages.data?.pages.flatMap(page => page.items) ?? [];
  const memberships = useQuery({ ...projectMembershipsQuery(workspaceId), enabled: tab === 'members' }).data ?? [];
  const joinedBy = (userId: string) => new Set(memberships.filter(row => row.userId === userId).map(row => row.projectId));
  const joinedProjects = (userId: string) => { const joined = joinedBy(userId); return projects.filter(project => joined.has(project.id)); };
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const go = useCallback((patch: Partial<MembersSearch>, replace = false) => void navigate({
    to: '/workspaces/$workspaceId/members', params: { workspaceId }, replace,
    search: Object.fromEntries(Object.entries({ ...search, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId, search]);
  const changed = () => refreshWorkspace(client, workspaceId).then(() => undefined);
  const sortKey = search.sort ?? USUAL_ORDER.key;
  const direction = search.dir ?? (search.sort ? 'asc' : USUAL_ORDER.direction);
  const compare = (a: Member, b: Member) => (sortKey === 'name' ? a.name.localeCompare(b.name, 'ko') : sortKey === 'role' ? roleRank(a.role) - roleRank(b.role)
    : a.joinedAt.localeCompare(b.joinedAt)) * (direction === 'asc' ? 1 : -1);
  const members = people.items
    .filter(member => (!search.q || member.name.includes(search.q) || member.email.includes(search.q)) && (!search.role || member.role === search.role))
    .sort(compare);
  const filters: ListFilter[] = tab === 'members'
    ? [{ key: 'role', label: '역할', icon: 'shield', value: search.role, options: [...ROLES].reverse().map(role => ({ value: role, label: ROLE_LABELS[role] })) }]
    : [];
  const order: ListSort | undefined = tab === 'members' ? {
    keys: SORT_KEYS, key: sortKey, direction, usual: USUAL_ORDER,
    onChange: (key, next) => go(key === USUAL_ORDER.key && next === USUAL_ORDER.direction ? { sort: undefined, dir: undefined } : { sort: key as MembersSearch['sort'], dir: next }, true),
  } : undefined;
  const canChange = (member: Member) => member.role !== 'owner' && member.userId !== me && (myRole === 'owner' || (myRole === 'admin' && member.role !== 'admin'));
  const roleOptions = (myRole === 'owner' ? ['admin', 'member', 'viewer'] as const : ['member', 'viewer'] as const).map(role => ({ value: role, label: ROLE_LABELS[role] }));
  const person = (member: Member) => <span className={styles.person}><DefaultAvatar seed={member.userId} name={member.name} size={32} />
    <span className={styles.personText}><span className={styles.personName}>{member.name}{member.userId === me ? ' (나)' : ''}</span><span className={styles.personEmail}>{member.email}</span></span></span>;
  const memberColumns: SheetColumn<Member>[] = [
    { key: 'name', header: '이름', render: person },
    { key: 'role', header: '역할', width: '9rem', render: row => (canChange(row)
      ? <Select label={`${row.name} 역할`} isLabelHidden size="sm" options={roleOptions} value={row.role}
        onChange={value => { if (value && value !== row.role) setPending({ kind: 'role', member: row, role: value as Role }); }} />
      : ROLE_LABELS[row.role]) },
    { key: 'projects', header: '참여 프로젝트', width: '13rem', render: row => {
      const mine = joinedProjects(row.userId);
      const label = mine.length === 0 ? (isManager ? '프로젝트에 넣기' : '없음') : mine.length === 1 ? mine[0]!.name : `${mine[0]!.name} 외 ${mine.length - 1}`;
      const body = <><span className={styles.marks}>{mine.slice(0, 3).map(project => <ProjectMark key={project.id} project={project} />)}</span>
        <span className={styles.projectsLabel}>{label}</span></>;
      return <button type="button" className={styles.projects} aria-label={`${row.name}의 참여 프로젝트: ${mine.map(project => project.name).join(', ') || '없음'}`}
        onClick={() => setProjectsOf(row)}>{body}</button>;
    } },
    { key: 'joined', header: '참여한 날', width: '8rem', render: row => dateText(row.joinedAt) },
    { key: 'menu', header: '', width: '3.5rem', align: 'end', render: row => {
      const items = canChange(row) ? [{ label: '구성원에서 제거', icon: <NavIcon name="delete" />, onClick: () => setPending({ kind: 'remove', member: row }) }]
        : row.userId === me && row.role !== 'owner' ? [{ label: '워크스페이스에서 나가기', icon: <NavIcon name="logout" />, onClick: () => setPending({ kind: 'leave', member: row }) }] : [];
      return items.length > 0 ? <MoreMenu label={`${row.name} 메뉴`} variant="ghost" size="sm" placement="end" items={items} /> : null;
    } },
  ];
  const memberSummary = <ListSummary shown={members.length} total={members.length} unit="명" step={members.length} hasMore={false} onMore={() => undefined} />;
  const invites = invitations.data?.items ?? [];
  const inviteColumns: SheetColumn<Invitation>[] = [
    { key: 'email', header: '이메일', render: row => <span className={styles.clip}>{row.email}</span> },
    { key: 'role', header: '역할', width: '7rem', render: row => ROLE_LABELS[row.role] },
    { key: 'by', header: '보낸 사람', width: '8rem', render: row => row.inviterName },
    { key: 'status', header: '상태', width: '6rem', render: row => { const token = STATUS_TOKENS[row.status] ?? STATUS_TOKENS.expired!; return <StatusToken label={token.label} color={token.color} />; } },
    { key: 'expires', header: '만료일', width: '7rem', render: row => dateText(row.expiresAt) },
    { key: 'menu', header: '', width: '3.5rem', align: 'end', render: row => (row.status === 'pending'
      ? <MoreMenu label={`${row.email} 초대 메뉴`} variant="ghost" size="sm" placement="end" items={[{ label: '초대 폐기', icon: <NavIcon name="delete" />, onClick: () => setPending({ kind: 'revoke', invite: row }) }]} />
      : null) },
  ];
  const inviteSummary = <ListSummary shown={invites.length} total={invites.length} unit="건" step={invites.length} hasMore={false} onMore={() => undefined} />;
  const confirm = async () => {
    if (!pending || isBusy) return;
    setBusy(true); setError(null);
    try {
      if (pending.kind === 'role') await changeRole(workspaceId, pending.member.memberId, pending.role);
      else if (pending.kind === 'remove') await removeMember(workspaceId, pending.member.memberId);
      else if (pending.kind === 'leave') {
        await leaveWorkspace(workspaceId);
        forgetWorkspace(client, workspaceId);
        void navigate({ to: '/workspaces' });
        return;
      } else await revokeInvitation(workspaceId, pending.invite.id);
      setPending(null);
    } catch (failure) { setError(new Error(authError(failure))); }
    finally { setBusy(false); await changed(); }
  };
  const tabs: PageTab<Tab>[] = [{ value: 'members', label: '구성원', icon: 'members' }, ...(isManager ? [{ value: 'invitations' as const, label: '초대', icon: 'mail' }] : [])];
  const request = tab === 'members' ? { isPending: people.isPending, isError: !!people.error, error: people.error, refetch: people.refetch } : invitations;
  return <PageFrame title="구성원" icon="members" chrome="header"
    tabs={<PageTabs value={tab} items={tabs} panelId={panelId} onChange={next => go({ view: next === 'members' ? undefined : 'invitations' })} />}>
    <ListToolbar search={tab === 'members' ? { label: '구성원 검색', placeholder: '이름이나 이메일로 찾기', value: search.q, onChange: q => go({ q: q || undefined }, true) } : undefined}
      label={tab === 'members' ? '구성원 조건' : '초대 조건'} filters={filters} onFiltersChange={values => go({ role: values.role as MembersSearch['role'] }, true)} order={order}
      action={isManager ? { label: '구성원 초대', icon: 'plus', onClick: () => void navigate({ to: '/workspaces/$workspaceId/members/invite', params: { workspaceId } }), isCreate: true } : undefined} />
    <div role="tabpanel" id={panelId}>
      {(request.isPending || request.isError) && <QueryMessage pending={request.isPending} error={request.error} retry={() => { void request.refetch(); }} />}
      {tab === 'members' && people.hasData && (members.length === 0
        ? <PageState kind="search" title={search.q ? `'${search.q}'에 맞는 구성원이 없습니다` : '이 역할의 구성원이 없습니다'} description={search.q ? '다른 이름이나 이메일로 찾아보세요.' : '다른 역할을 골라 보세요.'} />
        : isMobile
          ? <><ItemList label="구성원">{members.map(member => <ItemRow key={member.memberId} lead={<DefaultAvatar seed={member.userId} name={member.name} size={32} />}
            title={<span className={styles.personText}><span className={styles.personName}>{member.name}{member.userId === me ? ' (나)' : ''}</span><span className={styles.personEmail}>{member.email}</span></span>}
            meta={<><ItemMeta>{ROLE_LABELS[member.role]}</ItemMeta><ItemMeta>프로젝트 {joinedBy(member.userId).size}개</ItemMeta></>} />)}</ItemList>{memberSummary}</>
          : <SheetTable label="구성원" columns={memberColumns} rows={members} rowKey={row => row.memberId} minWidth="52rem" order={order} foot={memberSummary} />)}
      {tab === 'invitations' && invitations.data && (invites.length === 0
        ? <PageState title="보낸 초대가 없습니다" description="구성원 초대로 초대 링크를 만들어 전달하세요." />
        : isMobile
          ? <><ItemList label="초대">{invites.map(invite => { const token = STATUS_TOKENS[invite.status] ?? STATUS_TOKENS.expired!; return <ItemRow key={invite.id} title={invite.email}
            meta={<><ItemMeta>{ROLE_LABELS[invite.role]}</ItemMeta><ItemMeta><StatusToken label={token.label} color={token.color} /></ItemMeta><ItemMeta>{dateText(invite.expiresAt)}</ItemMeta></>} />; })}</ItemList>{inviteSummary}</>
          : <SheetTable label="초대" columns={inviteColumns} rows={invites} rowKey={row => row.id} minWidth="44rem" foot={inviteSummary} />)}
    </div>
    {projectsOf && <MemberProjectsDialog workspaceId={workspaceId} member={projectsOf} projects={projects} joined={joinedBy(projectsOf.userId)} canEdit={isManager}
      onClose={() => setProjectsOf(null)} />}
    {pending && <ConfirmDialog isPending={isBusy} error={error} onClose={() => { setPending(null); setError(null); }} onConfirm={() => { void confirm(); }}
      variant={pending.kind === 'role' ? 'primary' : 'destructive'}
      title={pending.kind === 'role' ? `${pending.member.name}의 역할을 바꿀까요?` : pending.kind === 'remove' ? `${pending.member.name}을(를) 구성원에서 뺄까요?`
        : pending.kind === 'leave' ? '이 워크스페이스에서 나갈까요?' : '초대를 폐기할까요?'}
      description={pending.kind === 'role' ? `${ROLE_LABELS[pending.member.role]} → ${ROLE_LABELS[pending.role]}. API 키 권한도 바로 바뀝니다.`
        : pending.kind === 'remove' ? '이 워크스페이스에 들어올 수 없게 됩니다. 다시 참여하려면 새 초대가 필요합니다.'
        : pending.kind === 'leave' ? '이 워크스페이스의 이슈와 문서를 더 볼 수 없게 됩니다. 다시 들어오려면 새 초대가 필요합니다.' : `${pending.invite.email}에 보낸 링크로 더 이상 참여할 수 없습니다.`}
      confirmLabel={pending.kind === 'role' ? '바꾸기' : pending.kind === 'remove' ? '빼기' : pending.kind === 'leave' ? '나가기' : '폐기'} />}
  </PageFrame>;
}
