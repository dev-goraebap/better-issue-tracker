import { useState, type MouseEvent } from 'react';
import { Button, IconButton, Popover, Text, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { authError, logout, sessionQueryOptions } from '@/shared/api';
import { DefaultAvatar, FormMessage, NavIcon } from '@/shared/ui';
import styles from './account-menu.module.css';
type AccountPath = '/settings/security' | '/settings/api-keys' | '/settings/appearance';
export function AccountMenu({ onNavigate, recovery = false, compact = false, folded = false }: { onNavigate?: (path: AccountPath) => void; recovery?: boolean; compact?: boolean; folded?: boolean }) {
  const { data } = useQuery(sessionQueryOptions); const client = useQueryClient(); const navigate = useNavigate();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [open, setOpen] = useState(false);
  const name = data?.user.name ?? '내 계정'; const email = data?.user.email ?? ''; const seed = data?.user.id ?? 'anonymous';
  function go(event: MouseEvent, path: AccountPath) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setOpen(false); if (onNavigate) { event.preventDefault(); onNavigate(path); }
  }
  async function exit(all: boolean) {
    if (busy) return; setBusy(true); setError('');
    try { await logout(all); setOpen(false); await client.cancelQueries(); client.clear(); await navigate({ to: '/login' }); }
    catch (failure) { setError(authError(failure)); } finally { setBusy(false); }
  }
  const who = <section className={styles.who}><DefaultAvatar seed={seed} name={name} /><VStack gap={0} className={styles.identity}><Text weight="semibold" maxLines={1}>{name}</Text><Text type="supporting" color="secondary" maxLines={1}>{email}</Text></VStack></section>;
  const actions = <section className={styles.menu}>
    {!recovery && <nav aria-label="계정 설정" className={styles.links}>
      <Link className={styles.link} to="/settings/security" onClick={event => go(event, '/settings/security')}>비밀번호 변경</Link>
      <Link className={styles.link} to="/settings/api-keys" onClick={event => go(event, '/settings/api-keys')}>API 키</Link>
      <Link className={styles.link} to="/settings/appearance" onClick={event => go(event, '/settings/appearance')}>화면 · 테마</Link>
    </nav>}
    <section className={styles.signOut}><Button label="로그아웃" variant="ghost" onClick={() => { void exit(false); }} isDisabled={busy} /><Button label="모든 기기에서 로그아웃" variant="ghost" onClick={() => { void exit(true); }} isDisabled={busy} /></section>
    <FormMessage message={error} />
  </section>;
  if (!compact) return <VStack gap={0}><section className={styles.account}>{who}</section>{actions}</VStack>;
  const popover = <Popover isOpen={open} onOpenChange={setOpen} placement={folded ? 'end' : 'below'} alignment="start" width={260} label="계정 메뉴" className={styles.popover} content={<>{folded && who}{actions}</>}>
    {folded ? <button type="button" className={styles.avatarButton} aria-label={`${name} 계정`}><DefaultAvatar seed={seed} name={name} /></button> : <IconButton label="계정 메뉴" icon={<NavIcon name="more" />} variant="ghost" size="sm" />}
  </Popover>;
  if (folded) return <section className={styles.folded}>{popover}</section>;
  return <section className={styles.account}><Link to="/settings/security" className={styles.accountLink} aria-label={`${name} 내 계정`} onClick={event => go(event, '/settings/security')}>{who}</Link>{popover}</section>;
}
