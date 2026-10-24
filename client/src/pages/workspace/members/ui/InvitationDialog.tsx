import { useEffect, useState } from 'react';
import { Button, Text, VStack } from '@astryxdesign/core';
import { authError } from '@/shared/api';
import { CompactDialog, EmailField, FormMessage, Select } from '@/shared/ui';
import { createInvitation, ROLE_LABELS, type Role } from '@/entities/workspace';
import styles from './members.module.css';

/**
 * 구성원 초대 (짧은 창): an email and a role (the owner may invite an admin; an admin invites members and viewers), then a
 * one-time link shown once to copy and hand over; it is hidden again when the page is left. The link lasts seven days.
 */
export function InvitationDialog({ workspaceId, myRole, isOpen, onClose, onChanged }: {
  workspaceId: string; myRole: Role; isOpen: boolean; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [link, setLink] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const clear = () => setLink('');
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, []);
  const roles: Role[] = myRole === 'owner' ? ['admin', 'member', 'viewer'] : ['member', 'viewer'];
  const close = () => {
    if (isBusy) return;
    setLink(''); setEmail(''); setRole('member'); setError(''); setNotice('');
    onClose();
  };
  const create = async () => {
    if (isBusy) return;
    setBusy(true); setError('');
    try {
      const created = await createInvitation(workspaceId, email, role);
      setLink(`${window.location.origin}/join#token=${encodeURIComponent(created.token)}`);
      setEmail('');
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); await onChanged(); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setNotice('초대 링크를 복사했습니다.'); }
    catch { setNotice('복사하지 못했습니다. 링크를 직접 선택해 복사하세요.'); }
  };
  const footer = link
    ? <><Button label="링크 복사" onClick={() => { void copy(); }} /><Button label="닫기" variant="primary" onClick={close} /></>
    : <><Button label="취소" variant="ghost" onClick={close} isDisabled={isBusy} /><Button type="submit" label="초대 링크 만들기" variant="primary" isLoading={isBusy} /></>;
  return <CompactDialog isOpen={isOpen} title="구성원 초대" subtitle="초대 링크는 7일 동안 한 번 쓸 수 있습니다. 링크를 직접 전달하세요." width={480} isBusy={isBusy}
    onClose={close} onSubmit={link ? undefined : () => { void create(); }} footer={footer}>
    {link
      ? <section className={styles.secret}><VStack gap={3}>
        <Text weight="semibold">지금 한 번만 보이는 초대 링크</Text>
        <code className={styles.code}>{link}</code>
      </VStack></section>
      : <>
        <EmailField value={email} onChange={setEmail} disabled={isBusy} />
        <Select label="역할" options={roles.map(each => ({ value: each, label: ROLE_LABELS[each] }))} value={role} onChange={value => setRole((value ?? 'member') as Role)} />
      </>}
    <FormMessage message={error} /><FormMessage message={notice} isError={false} />
  </CompactDialog>;
}
