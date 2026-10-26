import { useEffect, useRef, useState } from 'react';
import { Button, HStack, Text, TextInput, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { SignInForm } from '@/features/sign-in';
import { selectWorkspace } from '@/entities/workspace';
import { authError, command, logout, sessionQueryOptions } from '@/shared/api';
import type { components } from '@/shared/api';
import { AuthFrame, FormMessage, SectionHeader } from '@/shared/ui';
import { initialJoinToken, forgetInitialToken, subscribeJoinToken } from '../model/fragment';
export function JoinPage() {
  const [token, setToken] = useState(initialJoinToken); const [preview, setPreview] = useState<components['schemas']['Preview']>();
  const [name, setName] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const generation = useRef(0);
  const session = useQuery(sessionQueryOptions); const client = useQueryClient(); const navigate = useNavigate();
  useEffect(() => { forgetInitialToken(); const clear = () => { generation.current++; setToken(''); setPassword(''); setConfirmation(''); }; const unsubscribe = subscribeJoinToken(next => { clear(); setToken(next); setPreview(undefined); setError(''); setBusy(false); }); window.addEventListener('pagehide', clear); return () => { unsubscribe(); window.removeEventListener('pagehide', clear); }; }, []);
  async function inspect() {
    if (busy || !token) return; const request = generation.current; setBusy(true); setError('');
    try { const value = await command<components['schemas']['Preview']>('POST', '/api/v1/invitation-previews', { token }); if (request === generation.current) setPreview(value); }
    catch (failure) { if (request === generation.current) setError(authError(failure)); } finally { if (request === generation.current) setBusy(false); }
  }
  return <AuthFrame title="워크스페이스 초대">
    {!token ? <><Text>초대 링크가 필요합니다. 관리자에게 전달받은 링크를 다시 열어 주세요.</Text><Link to="/">내 공간으로</Link></> : <>
      {!preview && <><Text>초대를 확인하면 공간과 참여할 계정을 볼 수 있습니다.</Text><Button label="초대 확인" variant="primary" onClick={() => { void inspect(); }} isLoading={busy} /></>}
      {preview && <><Text weight="semibold">{preview.workspaceName}</Text><Text>{preview.email} · {preview.role}</Text><Text type="supporting">만료: {new Date(preview.expiresAt).toLocaleString('ko-KR')}</Text>
        {session.data?.mustChangePassword ? <><Text>비밀번호를 먼저 변경한 뒤 초대 링크를 다시 열어 주세요.</Text><Link to="/change-password">비밀번호 변경</Link></> : session.data ? <>
          <Text>로그인 계정: {session.data.user.email}</Text>
          {session.data.user.email.toLowerCase() === preview.email ? <Button label="초대 수락" variant="primary" isLoading={busy} onClick={async () => {
            if (busy) return; const request = generation.current; setBusy(true); setError('');
            try { await command('POST', '/api/v1/invitation-acceptances', { token }); }
            catch (failure) { if (request === generation.current) { setError(authError(failure)); setBusy(false); } return; }
            if (request !== generation.current) return; setToken(''); try { await selectWorkspace(preview.workspaceId); } catch { /* Optional preference only. */ }
            await client.invalidateQueries({ queryKey: ['workspaces'] }); await navigate({ to: '/workspaces/$workspaceId', params: { workspaceId: preview.workspaceId } });
          }} /> : <Text>초대받은 이메일의 계정으로 전환해 주세요.</Text>}
          <Button label="다른 계정으로 로그인" variant="ghost" isDisabled={busy} onClick={async () => { try { await logout(); await client.cancelQueries(); client.clear(); client.setQueryData(sessionQueryOptions.queryKey, null); } catch (failure) { setError(authError(failure)); } }} />
        </> : <VStack gap={6}>
          <SectionHeader title="기존 계정으로 참여" /><SignInForm initialEmail={preview.email} onSignedIn={async () => { await client.fetchQuery(sessionQueryOptions); }} />
          <SectionHeader title="처음 참여하시나요?" /><Text type="supporting">초대 이메일로 새 계정을 만듭니다. 가입 후 일반 로그인으로 참여하세요.</Text>
          <form onSubmit={async event => { event.preventDefault(); if (busy) return; if (password !== confirmation) { setError('비밀번호 확인이 일치하지 않습니다.'); return; } const request = generation.current; setBusy(true); setError('');
            try { await command('POST', '/api/v1/invitation-registrations', { token, name, password }); }
            catch (failure) { if (request === generation.current) { setError(authError(failure)); setPassword(''); setConfirmation(''); setBusy(false); } return; }
            if (request !== generation.current) return; setToken(''); setPassword(''); setConfirmation(''); await navigate({ to: '/login' });
          }}><VStack gap={4}>
            <TextInput label="이름" placeholder="예: 홍길동" value={name} onChange={setName} isRequired isDisabled={busy} />
            <TextInput label="새 비밀번호" type="password" placeholder="15~64자, UTF-8 72바이트 이하" value={password} onChange={setPassword} isRequired isDisabled={busy} />
            <TextInput label="비밀번호 확인" type="password" placeholder="같은 비밀번호를 다시 입력하세요" value={confirmation} onChange={setConfirmation} isRequired isDisabled={busy} />
            <HStack data-action-row><Button type="submit" label="초대 계정 만들기" isLoading={busy} /></HStack>
          </VStack></form>
        </VStack>}
      </>}
    </>}
    <FormMessage message={error} />
  </AuthFrame>;
}
