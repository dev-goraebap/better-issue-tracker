import { useCallback, useId, useState } from 'react';
import { MoreMenu } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { authError, sessionQueryOptions } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import {
  ConfirmDialog, DefaultAvatar, ItemList, ItemMeta, ItemRow, ListToolbar, NavIcon, PageFrame, PageState, PageTabs, QueryMessage, Select, SheetTable, StatusToken, type PageTab,
  type SheetColumn,
} from '@/shared/ui';
import {
  canManage, changeRole, invitationsQuery, refreshWorkspace, removeMember, revokeInvitation, ROLE_LABELS, useMembers, workspaceQuery, type Invitation, type Member,
  type Role,
} from '@/entities/workspace';
import type { MembersSearch } from '../model/search';
import { InvitationDialog } from './InvitationDialog';
import styles from './members.module.css';

type Tab = 'members' | 'invitations';
const STATUS_TOKENS: Record<string, { label: string; color: 'blue' | 'green' | 'gray' | 'red' }> = {
  pending: { label: '대기', color: 'blue' }, accepted: { label: '수락', color: 'green' }, expired: { label: '만료', color: 'gray' }, revoked: { label: '폐기', color: 'red' },
};
type Pending = { kind: 'role'; member: Member; role: Role } | { kind: 'remove'; member: Member } | { kind: 'revoke'; invite: Invitation };

/**
 * PATTERN · 탭마다 다른 리스트 (구성원), /w/$workspaceId/members (?view=invitations). One menu holding two lists of
 * different shapes.
 *
 * - The tab is the URL's view (구성원 left out); 초대 shows to the workspace's owner and admins only, with its own
 *   action (구성원 초대, a one-time link to hand over).
 * - 구성원 is a list (a table on a desktop, D-064): the person (picture, name, email), their role (a select for those
 *   the member may change: the owner changes anyone but the owner, an admin changes members and viewers), when they
 *   joined, and a row menu to remove them. Every change asks first. A phone shows the same rows as cards.
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
  const [isInviting, setInviting] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const go = useCallback((patch: Partial<MembersSearch>, replace = false) => void navigate({
    to: '/w/$workspaceId/members', params: { workspaceId }, replace,
    search: Object.fromEntries(Object.entries({ ...search, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId, search]);
  const changed = () => refreshWorkspace(client, workspaceId).then(() => undefined);
  const members = people.items.filter(member => !search.q || member.name.includes(search.q) || member.email.includes(search.q));
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
    { key: 'joined', header: '참여한 날', width: '8rem', render: row => dateText(row.joinedAt) },
    { key: 'menu', header: '', width: '3.5rem', align: 'end', render: row => (canChange(row)
      ? <MoreMenu label={`${row.name} 메뉴`} variant="ghost" size="sm" placement="end" items={[{ label: '구성원에서 제거', icon: <NavIcon name="delete" />, onClick: () => setPending({ kind: 'remove', member: row }) }]} />
      : null) },
  ];
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
  const confirm = async () => {
    if (!pending || isBusy) return;
    setBusy(true); setError(null);
    try {
      if (pending.kind === 'role') await changeRole(workspaceId, pending.member.memberId, pending.role);
      else if (pending.kind === 'remove') await removeMember(workspaceId, pending.member.memberId);
      else await revokeInvitation(workspaceId, pending.invite.id);
      setPending(null);
    } catch (failure) { setError(new Error(authError(failure))); }
    finally { setBusy(false); await changed(); }
  };
  const tabs: PageTab<Tab>[] = [{ value: 'members', label: '구성원', icon: 'members' }, ...(isManager ? [{ value: 'invitations' as const, label: '초대', icon: 'mail' }] : [])];
  const request = tab === 'members' ? { isPending: people.isPending, isError: !!people.error, error: people.error, refetch: people.refetch } : invitations;
  return <PageFrame title="구성원" icon="members" chrome="header"
    tabs={<PageTabs value={tab} items={tabs} panelId={panelId} onChange={next => go({ view: next === 'members' ? undefined : 'invitations' })} />}>
    <ListToolbar search={tab === 'members' ? { label: '구성원 검색', placeholder: '이름이나 이메일로 찾기', value: search.q, onChange: q => go({ q: q || undefined }, true) } : undefined}
      label="초대 조건" action={tab === 'invitations' ? { label: '구성원 초대', icon: 'plus', onClick: () => setInviting(true), isCreate: true } : undefined} />
    <div role="tabpanel" id={panelId}>
      {(request.isPending || request.isError) && <QueryMessage pending={request.isPending} error={request.error} retry={() => { void request.refetch(); }} />}
      {tab === 'members' && people.hasData && (members.length === 0
        ? <PageState kind="search" title={`'${search.q}'에 맞는 구성원이 없습니다`} description="다른 이름이나 이메일로 찾아보세요." />
        : isMobile
          ? <ItemList label="구성원">{members.map(member => <ItemRow key={member.memberId} lead={<DefaultAvatar seed={member.userId} name={member.name} size={32} />}
            title={<span className={styles.personText}><span className={styles.personName}>{member.name}{member.userId === me ? ' (나)' : ''}</span><span className={styles.personEmail}>{member.email}</span></span>}
            meta={<ItemMeta>{ROLE_LABELS[member.role]}</ItemMeta>} />)}</ItemList>
          : <SheetTable label="구성원" columns={memberColumns} rows={members} rowKey={row => row.memberId} minWidth="40rem" />)}
      {tab === 'invitations' && invitations.data && (invites.length === 0
        ? <PageState title="보낸 초대가 없습니다" description="구성원 초대로 초대 링크를 만들어 전달하세요." />
        : isMobile
          ? <ItemList label="초대">{invites.map(invite => { const token = STATUS_TOKENS[invite.status] ?? STATUS_TOKENS.expired!; return <ItemRow key={invite.id} title={invite.email}
            meta={<><ItemMeta>{ROLE_LABELS[invite.role]}</ItemMeta><ItemMeta><StatusToken label={token.label} color={token.color} /></ItemMeta><ItemMeta>{dateText(invite.expiresAt)}</ItemMeta></>} />; })}</ItemList>
          : <SheetTable label="초대" columns={inviteColumns} rows={invites} rowKey={row => row.id} minWidth="44rem" />)}
    </div>
    {isManager && <InvitationDialog isOpen={isInviting} workspaceId={workspaceId} myRole={myRole} onClose={() => setInviting(false)} onChanged={changed} />}
    {pending && <ConfirmDialog isPending={isBusy} error={error} onClose={() => { setPending(null); setError(null); }} onConfirm={() => { void confirm(); }}
      variant={pending.kind === 'role' ? 'primary' : 'destructive'}
      title={pending.kind === 'role' ? `${pending.member.name}의 역할을 바꿀까요?` : pending.kind === 'remove' ? `${pending.member.name}을(를) 구성원에서 뺄까요?` : '초대를 폐기할까요?'}
      description={pending.kind === 'role' ? `${ROLE_LABELS[pending.member.role]} → ${ROLE_LABELS[pending.role]}. API 키 권한도 바로 바뀝니다.`
        : pending.kind === 'remove' ? '이 워크스페이스에 들어올 수 없게 됩니다. 다시 참여하려면 새 초대가 필요합니다.' : `${pending.invite.email}에 보낸 링크로 더 이상 참여할 수 없습니다.`}
      confirmLabel={pending.kind === 'role' ? '바꾸기' : pending.kind === 'remove' ? '빼기' : '폐기'} />}
  </PageFrame>;
}
