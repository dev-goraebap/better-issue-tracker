import { useState } from 'react';
import { Button, Text, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { authError, logout, sessionQueryOptions } from '@/shared/api';
import { FormMessage } from '@/shared/ui';
import styles from './account-menu.module.css';
export function AccountMenu({ onNavigate, recovery = false }: { onNavigate?: (path: '/settings/security' | '/settings/api-keys') => void; recovery?: boolean }) {
  const { data } = useQuery(sessionQueryOptions); const client = useQueryClient(); const navigate = useNavigate();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function exit(all: boolean) {
    if (busy) return; setBusy(true); setError('');
    try { await logout(all); await client.cancelQueries(); client.clear(); await navigate({ to: '/login' }); }
    catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  }
  return <VStack gap={3} padding={4} data-action-row>
    <Text type="label">{data?.user.name ?? '내 계정'}</Text>
    {!recovery && <nav aria-label="계정 설정"><VStack gap={3}>
      <Link className={styles.link} to="/settings/security" onClick={event => { if (onNavigate) { event.preventDefault(); onNavigate('/settings/security'); } }}>비밀번호 변경</Link>
      <Link className={styles.link} to="/settings/api-keys" onClick={event => { if (onNavigate) { event.preventDefault(); onNavigate('/settings/api-keys'); } }}>API 키</Link>
    </VStack></nav>}
    <Button label="로그아웃" variant="ghost" onClick={() => { void exit(false); }} isDisabled={busy} />
    <Button label="모든 기기에서 로그아웃" variant="ghost" onClick={() => { void exit(true); }} isDisabled={busy} />
    <FormMessage message={error} />
  </VStack>;
}
