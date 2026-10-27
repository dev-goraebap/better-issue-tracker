import { useEffect, useState } from 'react';
import { Button, Text, TextInput, VStack } from '@astryxdesign/core';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { authError, createKey, keyQueryOptions, revokeKey } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import { MoreMenu, CompactDialog, ConfirmDialog, FormMessage, ListMore, NavIcon, PageFrame, QueryMessage, Select, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';
import styles from './keys.module.css';

const EXPIRY = [{ value: '7', label: '7일' }, { value: '30', label: '30일 (권장)' }, { value: '90', label: '90일' }, { value: '0', label: '만료 없음' }];

/**
 * PATTERN · 목록이 있는 설정, /settings/api-keys. Keys an agent uses to act as the member (D-021): one row each with its
 * prefix, its agent's name, when it was made, last used and ends, and its menu (폐기 behind ConfirmDialog). 새 키 opens a
 * short dialog for its name, the agent's name, how long it lasts and the member's password; the key itself is shown
 * once, right after it is made, to copy, and is cleared when the page is left.
 */
export function ApiKeysPage() {
  const client = useQueryClient();
  const keys = useInfiniteQuery(keyQueryOptions);
  const [isCreating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [days, setDays] = useState('30');
  const [password, setPassword] = useState('');
  const [made, setMade] = useState('');
  const [copied, setCopied] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<{ id: string; name: string } | null>(null);
  const [revokeError, setRevokeError] = useState<Error | null>(null);
  useEffect(() => { const clear = () => { setMade(''); setPassword(''); }; window.addEventListener('pagehide', clear); return () => window.removeEventListener('pagehide', clear); }, []);
  const closeCreate = () => { if (isBusy) return; setCreating(false); setName(''); setAgentName(''); setDays('30'); setPassword(''); setError(''); };
  const create = async () => {
    if (!name.trim() || !password || isBusy) return;
    setBusy(true); setError('');
    try {
      const key = await createKey({ name: name.trim(), agentName: agentName.trim() || undefined, expiresInDays: Number(days), currentPassword: password });
      setMade(key.key); setCopied('');
      setCreating(false); setName(''); setAgentName(''); setDays('30');
      await client.invalidateQueries({ queryKey: ['api-keys'] });
    } catch (failure) { setError(authError(failure)); }
    finally { setPassword(''); setBusy(false); }
  };
  const revoke = async () => {
    if (!revoking || isBusy) return;
    setBusy(true); setRevokeError(null);
    try { await revokeKey(revoking.id); setRevoking(null); await client.invalidateQueries({ queryKey: ['api-keys'] }); }
    catch (failure) { setRevokeError(new Error(authError(failure))); }
    finally { setBusy(false); }
  };
  const list = keys.data?.pages.flatMap(page => page.items) ?? [];
  return <PageFrame title="API 키" icon="key" width="narrow">
    <VStack gap={8}>
      <SettingsHead title="API 키" description="에이전트와 스크립트가 내 업무 권한으로 BIT에 접근할 키입니다. 비밀번호와 계정 보안 설정에는 쓸 수 없습니다." />
      {!keys.data ? <QueryMessage pending={keys.isPending} error={keys.error} retry={() => { void keys.refetch(); }} />
        : <SettingsCard title="내 키" id="api-keys" actions={<Button label="새 키" variant="secondary" size="sm" icon={<NavIcon name="plus" />} onClick={() => setCreating(true)} />}>
          {list.length === 0 && <SettingsRow label="키가 없습니다" description="에이전트나 스크립트가 내 권한으로 일하게 하려면 키를 만드세요." />}
          {list.map(key => <SettingsRow key={key.id} label={<>{key.name}{key.revokedAt && <> <StatusToken label="폐기됨" color="gray" /></>}</>}
            description={<><span className={styles.code}>{key.prefix}…</span>{key.agentName ? ` · ${key.agentName}` : ''} · 만든 날 {dateText(key.createdAt)}
              {' · '}{key.lastUsedAt ? `마지막 사용 ${dateText(key.lastUsedAt)}` : '아직 쓰지 않음'}{key.expiresAt && !key.revokedAt ? ` · ${dateText(key.expiresAt)}까지` : ''}</>}>
            {!key.revokedAt && <MoreMenu label={`${key.name} 메뉴`} variant="ghost" size="sm" placement="end"
              items={[{ label: '폐기', icon: <NavIcon name="delete" />, onClick: () => setRevoking({ id: key.id, name: key.name }) }]} />}
          </SettingsRow>)}
        </SettingsCard>}
      <ListMore hasMore={!!keys.hasNextPage} isLoading={keys.isFetchingNextPage} onMore={() => { void keys.fetchNextPage(); }} />
    </VStack>
    <CompactDialog isOpen={isCreating} title="새 API 키" subtitle="어디에 쓰는 키인지 알아볼 이름을 붙이세요." width={580} isBusy={isBusy} onClose={closeCreate} onSubmit={() => { void create(); }}
      footer={<><Button label="취소" variant="ghost" onClick={closeCreate} isDisabled={isBusy} /><Button className="bit-create-action" type="submit" label="만들기" variant="primary" isLoading={isBusy} isDisabled={!name.trim() || !password} /></>}>
      <TextInput label="이름" value={name} onChange={setName} hasAutoFocus isRequired isDisabled={isBusy} placeholder="예: Claude Code (노트북)" />
      <TextInput label="에이전트 이름" value={agentName} onChange={setAgentName} isOptional isDisabled={isBusy} placeholder="예: claude" description="이 키로 남긴 기록에 함께 적힙니다." />
      <Select label="만료" options={EXPIRY} value={days} onChange={value => setDays(value ?? '30')} isDisabled={isBusy} />
      <TextInput label="내 비밀번호" type="password" value={password} onChange={setPassword} isRequired isDisabled={isBusy} description="키를 만들기 전에 한 번 더 확인합니다." />
      <FormMessage message={error} />
    </CompactDialog>
    <CompactDialog isOpen={!!made} title="키를 복사하세요" subtitle="이 창을 닫으면 다시 볼 수 없습니다." onClose={() => setMade('')}
      footer={<><Button label="복사" variant="secondary" icon={<NavIcon name="copy" />} onClick={async () => {
        try { await navigator.clipboard.writeText(made); setCopied('키를 복사했습니다.'); } catch { setCopied('복사하지 못했습니다. 키를 직접 선택해 복사하세요.'); }
      }} /><Button label="닫기" variant="primary" onClick={() => setMade('')} /></>}>
      <Text className={styles.code}>{made}</Text>
      <FormMessage message={copied} isError={false} />
    </CompactDialog>
    {revoking && <ConfirmDialog title="키를 폐기할까요?" description={`'${revoking.name}' 키를 쓰는 에이전트는 바로 연결이 끊깁니다.`} confirmLabel="폐기" variant="destructive"
      isPending={isBusy} error={revokeError} onClose={() => { setRevoking(null); setRevokeError(null); }} onConfirm={() => { void revoke(); }} />}
  </PageFrame>;
}
