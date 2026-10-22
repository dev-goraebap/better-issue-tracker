import { useState } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { authError, changePassword } from '@/shared/api';
import { FormMessage } from '@/shared/ui';
export function PasswordChangeForm() {
  const [currentPassword, setCurrent] = useState(''); const [newPassword, setNew] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const client = useQueryClient(); const router = useRouter(); const navigate = useNavigate();
  return <form onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    if (newPassword !== confirm) { setError('비밀번호 확인이 일치하지 않습니다.'); return; }
    setBusy(true); setError('');
    try { await changePassword({ currentPassword, newPassword }); setCurrent(''); setNew(''); setConfirm(''); await client.cancelQueries(); client.clear(); await router.invalidate(); await navigate({ to: '/' }); }
    catch (failure) { setError(authError(failure)); setCurrent(''); }
    finally { setBusy(false); }
  }}><VStack gap={4}>
    <TextInput label="현재 비밀번호" type="password" placeholder="현재 또는 임시 비밀번호" value={currentPassword} onChange={setCurrent} isRequired isDisabled={busy} />
    <TextInput label="새 비밀번호" type="password" placeholder="15자 이상의 새 비밀번호" description="15~64자, UTF-8 72바이트 이하입니다. 공백과 한글을 사용할 수 있습니다." value={newPassword} onChange={setNew} isRequired isDisabled={busy} />
    <TextInput label="새 비밀번호 확인" type="password" placeholder="새 비밀번호를 다시 입력하세요" value={confirm} onChange={setConfirm} isRequired isDisabled={busy} />
    <FormMessage message={error} /><section data-action-row><Button type="submit" label="비밀번호 변경" variant="primary" isLoading={busy} /></section>
  </VStack></form>;
}
