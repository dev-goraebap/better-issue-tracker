import { useState } from 'react';
import { Button, HStack, Selector, Text, VStack } from '@astryxdesign/core';
import { authError, command } from '@/shared/api';
import { spacePath } from '@/entities/workspace';
import type { Member } from '@/entities/workspace';
import { CompactDialog, FormMessage } from '@/shared/ui';
import styles from './members.module.css';
export function MemberRow({ member, workspaceId, myRole, userId, onChanged }: { member: Member; workspaceId: string; myRole: string; userId?: string; onChanged: () => Promise<void> }) {
  const [role, setRole] = useState(member.role); const [confirm, setConfirm] = useState<'role' | 'remove'>(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const manages = member.role !== 'owner' && member.userId !== userId && (myRole === 'owner' || myRole === 'admin' && member.role !== 'admin');
  async function save() {
    if (busy) return; setBusy(true); setError('');
    try { await command(confirm === 'remove' ? 'DELETE' : 'PATCH', `${spacePath(workspaceId)}/members/${member.memberId}`, confirm === 'role' ? { role } : undefined); }
    catch (failure) { setError(authError(failure)); setBusy(false); await onChanged(); return; }
    setConfirm(undefined); setBusy(false); await onChanged();
  }
  return <li className={styles.row}><VStack gap={3}>
    <HStack gap={3} wrap="wrap"><Text weight="semibold">{member.name}{member.userId === userId ? ' (나)' : ''}</Text><Text type="supporting">{member.email} · {member.role}</Text></HStack>
    {manages && <HStack gap={3} wrap="wrap" data-action-row>
      <Selector label={`${member.name} 역할`} value={role} onChange={value => setRole(value as Member['role'])} options={[...(myRole === 'owner' ? [{ value: 'admin', label: 'admin' }] : []), { value: 'member', label: 'member' }, { value: 'viewer', label: 'viewer' }]} isDisabled={busy} />
      <Button label="역할 변경" isDisabled={busy || role === member.role} onClick={() => setConfirm('role')} /><Button label="멤버 제거" variant="ghost" isDisabled={busy} onClick={() => setConfirm('remove')} />
    </HStack>}
    <FormMessage message={error} />
    <CompactDialog isOpen={!!confirm} onClose={() => setConfirm(undefined)} isBusy={busy} title={confirm === 'remove' ? '멤버를 제거할까요?' : '역할을 변경할까요?'} footer={<><Button label="취소" variant="ghost" onClick={() => setConfirm(undefined)} isDisabled={busy} /><Button label="확인" variant="primary" onClick={() => { void save(); }} isLoading={busy} /></>}>
      <Text>{member.name} · {member.email}</Text><Text>{confirm === 'remove' ? '이 공간의 접근 권한이 사라집니다. 다시 참여하려면 새 초대가 필요합니다.' : `${member.role} → ${role}. 현재 역할로 API 키 권한도 즉시 바뀝니다.`}</Text>
    </CompactDialog>
  </VStack></li>;
}
