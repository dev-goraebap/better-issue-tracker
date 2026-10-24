import { useState } from 'react';
import { Button, HStack, Selector, Text, TextInput, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { membersQuery, workspaceQuery, spacePath } from '@/entities/workspace';
import { authError, command, sessionQueryOptions } from '@/shared/api';
import { CompactDialog, FormMessage, PageFrame, SectionHeader } from '@/shared/ui';
export function WorkspaceSettingsPage() {
  const { workspaceId: id } = useParams({ from: '/workspace/w/$workspaceId' }); const { cursor } = useSearch({ from: '/workspace/w/$workspaceId/settings/general' });
  const space = useQuery(workspaceQuery(id)); const people = useQuery(membersQuery(id, cursor)); const session = useQuery(sessionQueryOptions);
  const [name, setName] = useState(''); const [userId, setUser] = useState(''); const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState<'transfer' | 'leave' | 'delete'>(); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const client = useQueryClient(); const navigate = useNavigate(); const owner = space.data?.myRole === 'owner'; const edits = owner || space.data?.myRole === 'admin';
  async function refresh() { await client.invalidateQueries({ queryKey: ['workspace', id] }); await client.invalidateQueries({ queryKey: ['workspaces'] }); }
  async function commit() {
    if (busy) return; setBusy(true); setError(''); const action = confirm;
    try { await command(action === 'transfer' ? 'PUT' : 'DELETE', spacePath(id) + (action === 'transfer' ? '/owner' : action === 'leave' ? '/members/me' : ''), action === 'transfer' ? { userId, currentPassword: password } : undefined); }
    catch (failure) { setError(authError(failure)); setBusy(false); setPassword(''); await refresh(); return; }
    setConfirm(undefined); setPassword(''); setBusy(false);
    if (action !== 'transfer') { await client.cancelQueries({ queryKey: ['workspace', id] }); client.removeQueries({ queryKey: ['workspace', id] }); await client.invalidateQueries({ queryKey: ['workspaces'] }); await client.invalidateQueries({ queryKey: ['session'] }); await navigate({ to: '/workspaces' }); }
    else { setNotice('소유권을 이전했습니다. 내 역할은 admin입니다.'); await refresh(); }
  }
  return <PageFrame title="워크스페이스 설정" width="narrow"><VStack gap={6}>
    <SectionHeader title="일반 설정" /><Text>{space.data?.name} · {space.data?.slug}</Text><Text type="supporting">내 역할: {space.data?.myRole}</Text>
    {edits && <form onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); setNotice(''); try { await command('PATCH', spacePath(id), { name }); } catch (failure) { setError(authError(failure)); setBusy(false); await refresh(); return; } setName(''); setNotice('이름을 변경했습니다.'); setBusy(false); await refresh(); }}><VStack gap={4}><TextInput label="새 이름" placeholder={space.data?.name ?? '새 이름을 입력하세요'} value={name} onChange={setName} isRequired isDisabled={busy} /><section data-action-row><Button type="submit" label="이름 저장" variant="primary" isLoading={busy} /></section></VStack></form>}
    {owner && <><SectionHeader title="소유권 이전" /><Text type="supporting">기존 멤버에게 소유권을 넘기면 내 역할은 admin이 됩니다.</Text>
      {people.isError && <FormMessage message={authError(people.error)} />}
      <Selector label="새 owner (현재 목록의 멤버)" placeholder="소유권을 받을 사람을 고르세요" value={userId} onChange={setUser} hasSearch options={(people.data?.items ?? []).filter(person => person.userId !== session.data?.user.id).map(person => ({ value: person.userId, label: `${person.name} · ${person.email}` }))} isDisabled={busy} />
      <HStack gap={4}>{cursor && <Link to="/w/$workspaceId/settings/general" params={{ workspaceId: id }} search={{}}>처음 목록</Link>}{people.data?.nextCursor && <Link to="/w/$workspaceId/settings/general" params={{ workspaceId: id }} search={{ cursor: people.data.nextCursor }}>다음 멤버 목록</Link>}</HStack>
      <Button label="소유권 이전" onClick={() => setConfirm('transfer')} isDisabled={!userId || busy} />
    </>}
    <SectionHeader title={owner ? '워크스페이스 삭제' : '워크스페이스 탈퇴'} /><Text type="supporting">{owner ? '공간을 삭제하면 모든 멤버가 접근할 수 없습니다. 이 화면에서는 복원할 수 없습니다.' : '탈퇴하면 이 공간에 접근할 수 없습니다. 다시 참여하려면 새 초대가 필요합니다.'}</Text>
    <section data-action-row><Button label={owner ? '워크스페이스 삭제' : '워크스페이스 탈퇴'} variant="ghost" onClick={() => setConfirm(owner ? 'delete' : 'leave')} isDisabled={busy} /></section>
    <FormMessage message={error} /><FormMessage message={notice} isError={false} />
    <CompactDialog isOpen={!!confirm} onClose={() => { setConfirm(undefined); setPassword(''); }} isBusy={busy} title={confirm === 'transfer' ? '소유권을 이전할까요?' : confirm === 'delete' ? '워크스페이스를 삭제할까요?' : '워크스페이스를 탈퇴할까요?'} footer={<><Button label="취소" variant="ghost" onClick={() => { setConfirm(undefined); setPassword(''); }} isDisabled={busy} /><Button label="확인" variant="primary" onClick={() => { void commit(); }} isDisabled={confirm === 'transfer' && !password} isLoading={busy} /></>}>
      <Text>{space.data?.name}</Text><Text>{confirm === 'transfer' ? `새 owner: ${people.data?.items.find(person => person.userId === userId)?.email ?? userId}. 내 역할이 admin으로 바뀝니다.` : confirm === 'delete' ? '모든 멤버의 접근 권한이 사라지고 대기 중인 초대가 폐기됩니다.' : '내 접근 권한이 사라집니다. 다른 공간과 계정은 유지됩니다.'}</Text>
      {confirm === 'transfer' && <TextInput label="현재 비밀번호" type="password" placeholder="소유권 이전을 위해 다시 확인합니다" value={password} onChange={setPassword} isRequired isDisabled={busy} />}
      <FormMessage message={error} />
    </CompactDialog>
  </VStack></PageFrame>;
}
