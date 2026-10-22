import { useState } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError, login } from '@/shared/api';
import { EmailField, FormMessage } from '@/shared/ui';

export function SignInForm({ initialEmail = '', onSignedIn }: { initialEmail?: string; onSignedIn: () => Promise<void> }) {
  const [email, setEmail] = useState(initialEmail); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  return <form onSubmit={async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await login({ email, password }); setPassword(''); await client.cancelQueries(); client.clear(); await onSignedIn(); }
    catch (failure) { setError(authError(failure)); setPassword(''); } finally { setBusy(false); }
  }}><VStack gap={4}>
    <EmailField value={email} onChange={setEmail} disabled={busy} />
    <TextInput label="비밀번호" type="password" placeholder="비밀번호를 입력하세요" value={password} onChange={setPassword} isRequired isDisabled={busy} />
    <FormMessage message={error} /><section data-action-row><Button type="submit" label="로그인" variant="primary" isLoading={busy} /></section>
  </VStack></form>;
}
