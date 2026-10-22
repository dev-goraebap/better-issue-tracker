import { useEffect, useState } from 'react';
import { Button, Selector, Text, VStack } from '@astryxdesign/core';
import { authError, command } from '@/shared/api';
import type { components } from '@/shared/api';
import { spacePath } from '@/entities/workspace';
import { CompactDialog, EmailField, FormMessage } from '@/shared/ui';
import styles from './members.module.css';
export function InvitationDialog({ workspaceId, myRole, isOpen, onClose, onChanged }: { workspaceId: string; myRole: string; isOpen: boolean; onClose: () => void; onChanged: () => Promise<void> }) {
  const [email, setEmail] = useState(''); const [role, setRole] = useState('member'); const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  useEffect(() => { const clear = () => setSecret(''); window.addEventListener('pagehide', clear); return () => window.removeEventListener('pagehide', clear); }, []);
  function close() { if (busy) return; setSecret(''); setEmail(''); setRole('member'); setError(''); setNotice(''); onClose(); }
  async function create() {
    if (busy) return; setBusy(true); setError('');
    try { const created = await command<components['schemas']['CreatedInvitation']>('POST', `${spacePath(workspaceId)}/invitations`, { email, role }); setSecret(`${window.location.origin}/join#token=${encodeURIComponent(created.token)}`); setEmail(''); }
    catch (failure) { setError(authError(failure)); setBusy(false); await onChanged(); return; }
    setBusy(false); await onChanged();
  }
  const footer = secret ? <><Button label="링크 복사" onClick={async () => { try { await navigator.clipboard.writeText(secret); setNotice('초대 링크를 복사했습니다.'); } catch { setNotice('복사하지 못했습니다. 링크를 직접 선택해 복사하세요.'); } }} /><Button label="링크 숨기고 닫기" variant="primary" onClick={close} /></> : <><Button label="취소" variant="ghost" onClick={close} isDisabled={busy} /><Button type="submit" label="초대 링크 만들기" variant="primary" isLoading={busy} /></>;
  return <CompactDialog isOpen={isOpen} title="멤버 초대" onClose={close} isBusy={busy} width={480} onSubmit={secret ? undefined : () => { void create(); }} footer={footer}>
    <Text type="supporting">초대 링크는 7일 동안 한 번 사용할 수 있습니다. 링크를 직접 전달하세요.</Text>
    {!secret ? <><EmailField value={email} onChange={setEmail} disabled={busy} /><Selector label="초대 역할" value={role} onChange={setRole} options={[...(myRole === 'owner' ? [{ value: 'admin', label: 'admin' }] : []), { value: 'member', label: 'member' }, { value: 'viewer', label: 'viewer' }]} isDisabled={busy} /></> : <section className={styles.secret}><VStack gap={3}>
      <Text weight="semibold">지금 한 번만 표시되는 초대 링크</Text><code className={styles.code}>{secret}</code>
    </VStack></section>}
    <FormMessage message={error} /><FormMessage message={notice} isError={false} />
  </CompactDialog>;
}
