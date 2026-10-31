import { useCallback, useId, useState } from 'react';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { authError } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import {
  MoreMenu,
  ConfirmDialog, DefaultAvatar, ItemList, ItemMeta, ItemRow, ListSummary, ListToolbar, NavIcon, PageFrame, PageState, PageTabs, QueryMessage, SheetTable, StatusToken,
  type ListFilter, type ListSort, type PageTab, type SheetColumn, type SortKey,
} from '@/shared/ui';
import {
  customRolesQuery, canManage, invitationsQuery, refreshWorkspace, revokeInvitation, ROLE_LABELS, ROLES, useMembers, workspaceQuery,
  type Invitation, type Member, type Role,
} from '@/entities/workspace';
import { ProjectMark } from '@/entities/project';
import { useMemberActions } from '@/features/member-actions';
import type { MembersSearch } from '../model/search';
import styles from './members.module.css';

type Tab = 'members' | 'invitations';
const STATUS_TOKENS: Record<string, { label: string; color: 'blue' | 'green' | 'gray' | 'red' }> = {
  pending: { label: '대기', color: 'blue' }, accepted: { label: '수락', color: 'green' }, expired: { label: '만료', color: 'gray' }, revoked: { label: '폐기', color: 'red' },
};
type Pending = { kind: 'revoke'; invite: Invitation };
/** The orders 구성원 offers; the usual one is by when they joined, the earliest first. */
const SORT_KEYS: readonly SortKey[] = [
  { value: 'joined', label: '참여한 날', kind: 'date' }, { value: 'name', label: '이름', kind: 'text' }, { value: 'role', label: '역할', kind: 'rank' },
];
const USUAL_ORDER = { key: 'joined', direction: 'asc' } as const;
const roleRank = (role: Role) => ROLES.indexOf(role);

/** Member and invitation lists share row actions on desktop and mobile. */
export function MembersPage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const search = useSearch({ strict: false }) as MembersSearch;
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const navigate = useNavigate();
  const client = useQueryClient();
  const panelId = useId();
  const memberActions = useMemberActions(workspaceId);
  const { me, joinedBy, joinedProjects } = memberActions;
  const workspace = useQuery(workspaceQuery(workspaceId)).data;
  const isManager = canManage(workspace, 'MANAGE_MEMBERS');
  const customRoles = useQuery(customRolesQuery(workspaceId)).data ?? [];
  const tab: Tab = isManager && search.view === 'invitations' ? 'invitations' : 'members';
  const people = useMembers(workspaceId);
  const invitations = useQuery({ ...invitationsQuery(workspaceId), enabled: tab === 'invitations' });
  const [pending, setPending] = useState<Pending | null>(null);
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
    .filter(member => (!search.q || member.name.includes(search.q) || member.email.includes(search.q)) && (!search.role || (member.customRoleId ?? member.role) === search.role))
    .sort(compare);
  const filters: ListFilter[] = tab === 'members'
    ? [{ key: 'role', label: '역할', icon: 'roles', value: search.role, options: [...[...ROLES].reverse().map(role => ({ value: role, label: ROLE_LABELS[role] })), ...customRoles.map(role => ({ value: role.id, label: role.name }))] }]
    : [];
  const order: ListSort | undefined = tab === 'members' ? {
    keys: SORT_KEYS, key: sortKey, direction, usual: USUAL_ORDER,
    onChange: (key, next) => go(key === USUAL_ORDER.key && next === USUAL_ORDER.direction ? { sort: undefined, dir: undefined } : { sort: key as MembersSearch['sort'], dir: next }, true),
  } : undefined;
  const person = (member: Member) => <span className={styles.person}><DefaultAvatar seed={member.userId} name={member.name} size={24} />
    <span className={styles.personText}><span className={styles.personName}>{member.name}{member.userId === me ? ' (나)' : ''}</span><span className={styles.personEmail}>{member.email}</span></span></span>;
  const memberColumns: SheetColumn<Member>[] = [
    { key: 'name', header: '이름', render: person },
    { key: 'role', header: '역할', width: '9rem', render: row => row.roleName ?? ROLE_LABELS[row.role] },
    { key: 'projects', header: '참여 프로젝트', width: '13rem', render: row => {
      const mine = joinedProjects(row.userId);
      const label = mine.length === 0 ? (isManager ? '프로젝트에 넣기' : '없음') : mine.length === 1 ? mine[0]!.name : `${mine[0]!.name} 외 ${mine.length - 1}`;
      const body = <><span className={styles.marks}>{mine.slice(0, 3).map(project => <span key={project.id} className={styles.markSlot}><ProjectMark project={project} /></span>)}</span>
        <span className={styles.projectsLabel}>{label}</span></>;
      return <button type="button" className={styles.projects} aria-label={`${row.name}의 참여 프로젝트: ${mine.map(project => project.name).join(', ') || '없음'}`}
        onClick={() => memberActions.openProjects(row)}>{body}</button>;
    } },
    { key: 'joined', header: '참여한 날', width: '8rem', render: row => dateText(row.joinedAt) },
    { key: 'menu', header: '', width: '3.5rem', align: 'end', render: memberActions.menu },
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
      await revokeInvitation(workspaceId, pending.invite.id);
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
            meta={<><ItemMeta>{member.roleName ?? ROLE_LABELS[member.role]}</ItemMeta><ItemMeta>프로젝트 {joinedBy(member.userId).size}개</ItemMeta></>} end={memberActions.menu(member)} />)}</ItemList>{memberSummary}</>
          : <SheetTable label="구성원" columns={memberColumns} rows={members} rowKey={row => row.memberId} minWidth="52rem" order={order} foot={memberSummary} />)}
      {tab === 'invitations' && invitations.data && (invites.length === 0
        ? <PageState title="보낸 초대가 없습니다" description="구성원 초대로 초대 링크를 만들어 전달하세요." />
        : isMobile
          ? <><ItemList label="초대">{invites.map(invite => { const token = STATUS_TOKENS[invite.status] ?? STATUS_TOKENS.expired!; return <ItemRow key={invite.id} title={invite.email}
            meta={<><ItemMeta>{ROLE_LABELS[invite.role]}</ItemMeta><ItemMeta><StatusToken label={token.label} color={token.color} /></ItemMeta><ItemMeta>{dateText(invite.expiresAt)}</ItemMeta></>} end={invite.status === 'pending' ? <MoreMenu label={`${invite.email} 초대 메뉴`} placement="end" items={[{ label: '초대 폐기', onClick: () => { setError(null); setPending({ kind: 'revoke', invite }); } }]} /> : undefined} />; })}</ItemList>{inviteSummary}</>
          : <SheetTable label="초대" columns={inviteColumns} rows={invites} rowKey={row => row.id} minWidth="44rem" foot={inviteSummary} />)}
    </div>
    {memberActions.dialogs}
    {pending && <ConfirmDialog isPending={isBusy} error={error} onClose={() => { setPending(null); setError(null); }} onConfirm={() => { void confirm(); }}
      variant="destructive" title="초대를 폐기할까요?" description={`${pending.invite.email}에 보낸 링크로 더 이상 참여할 수 없습니다.`} confirmLabel="폐기" />}
  </PageFrame>;
}
