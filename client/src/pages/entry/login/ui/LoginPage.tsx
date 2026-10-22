import { useState } from 'react';
import { Button, Text, TextInput, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { authError, login } from '@/shared/api';
import { AuthFrame, EmailField, FormMessage } from '@/shared/ui';
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const client = useQueryClient(); const router = useRouter(); const navigate = useNavigate();
  return <AuthFrame title="로그인"><Text color="secondary">계정으로 로그인해 작업의 맥락을 이어가세요.</Text>
    <form onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      try { await login({ email, password }); setPassword(''); await client.cancelQueries(); client.clear(); await router.invalidate(); await navigate({ to: '/' }); }
      catch (failure) { setError(authError(failure)); setPassword(''); }
      finally { setBusy(false); }
    }}><VStack gap={4}>
      <EmailField value={email} onChange={setEmail} disabled={busy} />
      <TextInput label="비밀번호" type="password" placeholder="비밀번호를 입력하세요" value={password} onChange={setPassword} isRequired isDisabled={busy} />
      <FormMessage message={error} /><section data-action-row><Button type="submit" label="로그인" variant="primary" isLoading={busy} /></section>
    </VStack></form>
    <Text type="supporting">새 계정은 워크스페이스 초대로 참여합니다. 계정 복구는 인스턴스 관리자에게 문의하세요.</Text>
  </AuthFrame>;
}
