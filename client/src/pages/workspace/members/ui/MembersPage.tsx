import { useState } from 'react';
import { Button, HStack, Popover, Text, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { membersQuery, workspaceQuery, spacePath } from '@/entities/workspace';
import { authError, command, sessionQueryOptions } from '@/shared/api';
import { CompactDialog, FormMessage, PageFrame, SectionHeader } from '@/shared/ui';
import { invitationsQuery } from '../api/members';
import { MemberRow } from './MemberRow';
import { InvitationDialog } from './InvitationDialog';
import styles from './members.module.css';
export function MembersPage() {
  const { workspaceId: id } = useParams({ from: '/workspace/w/$workspaceId' });
  const search = useSearch({ from: '/workspace/w/$workspaceId/members' }); const { cursor, status, view } = search;
  const space = useQuery(workspaceQuery(id)); const manager = space.data?.myRole === 'owner' || space.data?.myRole === 'admin';
  const people = useQuery({ ...membersQuery(id, cursor), enabled: view === 'members' });
  const invitations = useQuery({ ...invitationsQuery(id, status, cursor), enabled: view === 'invitations' && manager });
  const session = useQuery(sessionQueryOptions); const client = useQueryClient(); const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [revoking, setRevoking] = useState<string>(); const [filterOpen, setFilterOpen] = useState(false);
  async function changed() {
    await client.cancelQueries({ queryKey: ['workspace', id] });
    client.removeQueries({ queryKey: ['workspace', id], type: 'inactive' });
    await client.invalidateQueries({ queryKey: ['workspace', id] });
    await client.invalidateQueries({ queryKey: ['workspaces'] });
    if (cursor) await navigate({ to: '/w/$workspaceId/members', params: { workspaceId: id }, search: { view, status } });
  }
  const next = view === 'members' ? people.data?.nextCursor : invitations.data?.nextCursor;
  const request = view === 'members' ? people : invitations;
  const filter = view === 'invitations' && manager && <Popover label="초대 상태 필터" isOpen={filterOpen} onOpenChange={setFilterOpen} content={<VStack gap={2} padding={3}>{[['', '전체'], ['pending', '대기'], ['accepted', '수락'], ['expired', '만료'], ['revoked', '폐기']].map(([value, label]) => <Button key={value} label={label} variant="ghost" onClick={() => { setFilterOpen(false); void navigate({ to: '/w/$workspaceId/members', params: { workspaceId: id }, search: { view, status: value } }); }} />)}</VStack>}><Button label="필터" variant="ghost" /></Popover>;
  return <PageFrame title="멤버" actions={manager && view === 'invitations' ? <Button label="멤버 초대" variant="primary" onClick={() => setInviteOpen(true)} /> : undefined} tabs={<nav aria-label="멤버 관리"><HStack gap={4}><Link to="/w/$workspaceId/members" params={{ workspaceId: id }} search={{ view: 'members', status: '' }} aria-current={view === 'members' ? 'page' : undefined}>멤버</Link>{manager && <Link to="/w/$workspaceId/members" params={{ workspaceId: id }} search={{ view: 'invitations', status: '' }} aria-current={view === 'invitations' ? 'page' : undefined}>초대</Link>}</HStack></nav>} tools={filter} conditions={view === 'invitations' && status ? <><Text type="supporting">상태: {status}</Text><Button label="조건 지우기" variant="ghost" onClick={() => { void navigate({ to: '/w/$workspaceId/members', params: { workspaceId: id }, search: { view, status: '' } }); }} /></> : undefined}>
    {request.isError && <><FormMessage message={authError(request.error)} /><Button label="다시 불러오기" onClick={() => { void request.refetch(); }} /></>}
    {view === 'members' ? <ul className={styles.list}>{people.data?.items.map(member => <MemberRow key={`${member.memberId}-${member.role}`} member={member} workspaceId={id} myRole={space.data?.myRole ?? ''} userId={session.data?.user.id} onChanged={changed} />)}</ul> : !manager ? <Text>초대 관리는 owner와 admin만 사용할 수 있습니다.</Text> : <VStack gap={6}>
      <SectionHeader title="초대 목록" />{invitations.data?.items.length === 0 && <Text color="secondary">이 조건에 해당하는 초대가 없습니다.</Text>}
      <ul className={styles.list}>{invitations.data?.items.map(invite => <li key={invite.id} className={styles.row}><VStack gap={2}><Text weight="semibold">{invite.email}</Text><Text type="supporting">{invite.role} · {invite.status} · 초대한 사람: {invite.inviterName}</Text><Text type="supporting">생성: {new Date(invite.createdAt).toLocaleString('ko-KR')} · 만료: {new Date(invite.expiresAt).toLocaleString('ko-KR')}</Text>{invite.status === 'pending' && <Button label="초대 폐기" variant="ghost" onClick={() => setRevoking(invite.id)} />}</VStack></li>)}</ul>
    </VStack>}
    <nav aria-label="멤버 목록 페이지"><HStack gap={4}>{cursor && <Link to="/w/$workspaceId/members" params={{ workspaceId: id }} search={{ view, status }}>처음으로</Link>}{next && <Link to="/w/$workspaceId/members" params={{ workspaceId: id }} search={{ view, status, cursor: next }}>다음 페이지</Link>}</HStack></nav>
    <FormMessage message={error} />
    {manager && view === 'invitations' && <InvitationDialog isOpen={inviteOpen} workspaceId={id} myRole={space.data?.myRole ?? ''} onClose={() => setInviteOpen(false)} onChanged={changed} />}
    <CompactDialog isOpen={!!revoking} onClose={() => setRevoking(undefined)} isBusy={busy} title="초대를 폐기할까요?" footer={<><Button label="취소" variant="ghost" onClick={() => setRevoking(undefined)} isDisabled={busy} /><Button label="폐기" variant="primary" isLoading={busy} onClick={async () => { if (busy || !revoking) return; setBusy(true); setError(''); try { await command('DELETE', `${spacePath(id)}/invitations/${revoking}`); setRevoking(undefined); } catch (failure) { setError(authError(failure)); } setBusy(false); await changed(); }} /></>}>
      <Text>전달한 링크로 더 이상 참여할 수 없습니다.</Text>
    </CompactDialog>
  </PageFrame>;
}
