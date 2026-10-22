import { useState } from 'react';
import { Button, Text, TextInput, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError, bootstrap } from '@/shared/api';
import { AuthFrame, EmailField, FormMessage } from '@/shared/ui';
export function BootstrapPage() {
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const client = useQueryClient(); const navigate = useNavigate();
  return <AuthFrame title="첫 관리자 만들기"><Text color="secondary">설치를 관리할 첫 계정을 만듭니다. 가입 후 로그인해 주세요.</Text>
    <form onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      if (password !== confirm) { setError('비밀번호 확인이 일치하지 않습니다.'); return; }
      setBusy(true); setError('');
      try { await bootstrap({ name, email, password }); setPassword(''); setConfirm(''); await client.invalidateQueries({ queryKey: ['bootstrap'] }); await navigate({ to: '/login' }); }
      catch (failure) { setError(authError(failure)); }
      finally { setBusy(false); }
    }}><VStack gap={4}>
      <TextInput label="이름" placeholder="예: 김비트" value={name} onChange={setName} isRequired isDisabled={busy} />
      <EmailField value={email} onChange={setEmail} disabled={busy} />
      <TextInput label="비밀번호" type="password" placeholder="15자 이상의 비밀번호" description="15~64자, UTF-8 72바이트 이하입니다. 공백과 한글을 사용할 수 있습니다." value={password} onChange={setPassword} isRequired isDisabled={busy} />
      <TextInput label="비밀번호 확인" type="password" placeholder="같은 비밀번호를 다시 입력하세요" value={confirm} onChange={setConfirm} isRequired isDisabled={busy} />
      <FormMessage message={error} /><section data-action-row><Button type="submit" label="관리자 계정 만들기" variant="primary" isLoading={busy} /></section>
    </VStack></form><Text type="supporting">이메일 소유 여부는 확인하지 않습니다. 이메일 주소를 정확히 입력해 주세요.</Text>
  </AuthFrame>;
}
