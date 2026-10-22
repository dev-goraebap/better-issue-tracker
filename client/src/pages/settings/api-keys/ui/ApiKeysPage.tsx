import { useEffect, useState } from 'react';
import { Button, HStack, Selector, Text, TextInput, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { authError, createKey, keyQueryOptions, revokeKey } from '@/shared/api';
import { CompactDialog, FormMessage, PageFrame, SectionHeader } from '@/shared/ui';
import styles from './keys.module.css';
export function ApiKeysPage() {
  const { cursor } = useSearch({ from: '/workspace/settings/api-keys' });
  const result = useQuery(keyQueryOptions(cursor)); const client = useQueryClient();
  const [name, setName] = useState(''); const [agentName, setAgent] = useState(''); const [days, setDays] = useState('30');
  const [password, setPassword] = useState(''); const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [revoking, setRevoking] = useState<string>();
  useEffect(() => { const clear = () => { setSecret(''); setPassword(''); }; window.addEventListener('pagehide', clear); return () => window.removeEventListener('pagehide', clear); }, []);
  async function revoke() {
    if (!revoking || busy) return; setBusy(true); setError('');
    try { await revokeKey(revoking); setRevoking(undefined); setSecret(''); await client.invalidateQueries({ queryKey: ['api-keys'] }); }
    catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  }
  return <PageFrame title="API 키"><VStack gap={6}>
    <Text color="secondary">에이전트는 내 업무 권한으로 활동합니다. 비밀번호·API 키·계정 보안 설정에는 접근할 수 없습니다.</Text>
    <form className={styles.form} onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError(''); setSecret(''); setNotice('');
      try { const key = await createKey({ name, agentName: agentName || undefined, expiresInDays: Number(days), currentPassword: password }); setSecret(key.key); setName(''); setAgent(''); await client.invalidateQueries({ queryKey: ['api-keys'] }); }
      catch (failure) { setError(authError(failure)); }
      finally { setPassword(''); setBusy(false); }
    }}><VStack gap={4}>
      <SectionHeader title="키 만들기" />
      <TextInput label="키 이름" placeholder="예: 개발 노트북" value={name} onChange={setName} isRequired isDisabled={busy} />
      <TextInput label="에이전트 이름" placeholder="예: codex" value={agentName} onChange={setAgent} isOptional isDisabled={busy} />
      <Selector label="만료" value={days} onChange={setDays} options={[{ value: '1', label: '1일' }, { value: '7', label: '7일' }, { value: '30', label: '30일 (권장)' }, { value: '90', label: '90일' }, { value: '0', label: '만료 없음' }]} isDisabled={busy} />
      {days === '0' && <Text type="supporting">직접 폐기하기 전까지 사용할 수 있습니다. 안전한 곳에 보관해 주세요.</Text>}
      <TextInput label="현재 비밀번호" type="password" placeholder="키 발급을 위해 다시 확인합니다" value={password} onChange={setPassword} isRequired isDisabled={busy} />
      <section data-action-row><Button type="submit" label="API 키 만들기" variant="primary" isLoading={busy} /></section>
    </VStack></form>
    {secret && <section className={styles.secret} aria-label="새 API 키"><VStack gap={3}>
      <SectionHeader title="지금 한 번만 표시됩니다" /><Text>화면을 떠나면 다시 확인할 수 없습니다. 비밀번호처럼 안전하게 보관하세요.</Text>
      <code className={styles.code}>{secret}</code><HStack gap={3} wrap="wrap" data-action-row>
        <Button label="키 복사" onClick={async () => { try { await navigator.clipboard.writeText(secret); setNotice('키를 복사했습니다.'); } catch { setNotice('복사하지 못했습니다. 키를 직접 선택해 복사해 주세요.'); } }} />
        <Button label="키 숨기기" variant="ghost" onClick={() => setSecret('')} />
      </HStack>
    </VStack></section>}
    <FormMessage message={error} /><FormMessage message={notice} isError={false} />
    <SectionHeader title="내 키" />
    {result.isPending && <Text>키 목록을 불러오고 있습니다.</Text>}
    {result.isError && <><FormMessage message={authError(result.error)} /><Button label="다시 불러오기" onClick={() => { void result.refetch(); }} /></>}
    {result.data?.items.length === 0 && <Text color="secondary">아직 API 키가 없습니다. 에이전트를 연결할 때 키를 만들어 주세요.</Text>}
    <ul className={styles.list}>{result.data?.items.map(key => <li key={key.id} className={styles.item}><VStack gap={2}>
      <Text weight="semibold">{key.name}</Text><Text type="supporting">{key.prefix}… · {key.agentName || '에이전트 이름 없음'}</Text>
      <Text type="supporting">생성: {new Date(key.createdAt).toLocaleString('ko-KR')} · 최근 사용: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('ko-KR') : '아직 없음'}</Text>
      <Text type="supporting">{key.revokedAt ? '폐기됨' : key.expiresAt ? `만료: ${new Date(key.expiresAt).toLocaleString('ko-KR')}` : '만료 없음'}</Text>
      {!key.revokedAt && <section data-action-row><Button label={`${key.name} 폐기`} variant="ghost" onClick={() => setRevoking(key.id)} isDisabled={busy} /></section>}
    </VStack></li>)}</ul>
    <nav aria-label="API 키 페이지"><HStack gap={4}>
      {cursor && <Link to="/settings/api-keys" search={{}}>처음으로</Link>}
      {result.data?.nextCursor && <Link to="/settings/api-keys" search={{ cursor: result.data.nextCursor }}>다음 페이지</Link>}
    </HStack></nav>
    <CompactDialog isOpen={!!revoking} onClose={() => setRevoking(undefined)} isBusy={busy} title="API 키를 폐기할까요?" footer={<><Button label="취소" variant="ghost" onClick={() => setRevoking(undefined)} isDisabled={busy} /><Button label="폐기" variant="primary" onClick={() => { void revoke(); }} isLoading={busy} /></>}>
      <Text>이 키를 사용하는 에이전트는 더 이상 연결할 수 없습니다.</Text>
    </CompactDialog>
  </VStack></PageFrame>;
}
