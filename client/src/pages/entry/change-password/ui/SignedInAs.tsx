import { useState } from 'react';
import { Button, Text, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError, logout, sessionQueryOptions } from '@/shared/api';
import { DefaultAvatar, FormMessage } from '@/shared/ui';
import styles from './signed-in-as.module.css';

/**
 * Who is signed in while a temporary password must be changed, and the ways out: 로그아웃 here, or on every device (the
 * one leaving a shared computer, or someone else who signed in with the same temporary password).
 */
export function SignedInAs() {
  const me = useQuery(sessionQueryOptions).data?.user;
  const client = useQueryClient();
  const navigate = useNavigate();
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const exit = async (isEverywhere: boolean) => {
    if (isBusy) return;
    setBusy(true); setError('');
    try { await logout(isEverywhere); await client.cancelQueries(); client.clear(); await navigate({ to: '/login' }); }
    catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <VStack gap={0}>
    <section className={styles.who}>
      <DefaultAvatar seed={me?.id ?? 'anonymous'} name={me?.name ?? ''} />
      <VStack gap={0} className={styles.identity}><Text weight="semibold" maxLines={1}>{me?.name}</Text><Text type="supporting" color="secondary" maxLines={1}>{me?.email}</Text></VStack>
    </section>
    <section className={styles.signOut}>
      <Button label="로그아웃" variant="ghost" onClick={() => { void exit(false); }} isDisabled={isBusy} />
      <Button label="모든 기기에서 로그아웃" variant="ghost" onClick={() => { void exit(true); }} isDisabled={isBusy} />
    </section>
    <FormMessage message={error} />
  </VStack>;
}
