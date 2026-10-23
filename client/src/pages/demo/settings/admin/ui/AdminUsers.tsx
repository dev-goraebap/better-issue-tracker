import { useState } from 'react';
import { Button, VStack } from '@astryxdesign/core';
import { ConfirmDialog, DefaultAvatar, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';
import { ME, PEOPLE } from '@/entities/demo-sample';

/**
 * 사용자: everyone with an account on the instance (agents are API keys, not here), the administrators marked; an
 * account other than one's own is locked or opened again, locking asking first as it signs the person out everywhere.
 */
export function AdminUsers() {
  const [locked, setLocked] = useState<Set<string>>(() => new Set());
  const [locking, setLocking] = useState<string | null>(null);
  const users = PEOPLE.filter(person => person.kind === 'user');
  const nameOf = (id: string) => users.find(person => person.id === id)?.name ?? '';
  return <VStack gap={8}>
    <SettingsHead title="사용자" description="이 서버에 계정이 있는 모든 사람입니다. 첫 가입자가 인스턴스 관리자가 됩니다." />
    <SettingsCard title={`사용자 ${users.length}명`} id="admin-users">
      {users.map(person => <SettingsRow key={person.id} lead={<DefaultAvatar seed={person.id} name={person.name} size={32} />}
        label={<>{person.name}{person.id === ME && <> <StatusToken label="인스턴스 관리자" color="blue" /></>}{locked.has(person.id) && <> <StatusToken label="잠김" color="red" /></>}</>}
        description={person.email}>
        {person.id !== ME && (locked.has(person.id)
          ? <Button label="잠금 풀기" variant="secondary" size="sm" onClick={() => setLocked(new Set([...locked].filter(id => id !== person.id)))} />
          : <Button label="잠그기" variant="ghost" size="sm" onClick={() => setLocking(person.id)} />)}
      </SettingsRow>)}
    </SettingsCard>
    {locking && <ConfirmDialog title={`${nameOf(locking)} 님의 계정을 잠글까요?`} description="모든 기기에서 로그아웃되고, 풀기 전까지 로그인할 수 없습니다. 작업과 기록은 그대로 남습니다."
      confirmLabel="잠그기" variant="destructive" onClose={() => setLocking(null)} onConfirm={() => { setLocked(new Set([...locked, locking])); setLocking(null); }} />}
  </VStack>;
}
