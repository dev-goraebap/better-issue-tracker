import { useState } from 'react';
import { Button, MoreMenu, Text, TextInput, VStack } from '@astryxdesign/core';
import { CompactDialog, ConfirmDialog, NavIcon, PageFrame, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { API_KEYS, agoText, dateText, demoStyles, type ApiKey } from '@/entities/demo-sample';

/**
 * PATTERN · 목록이 있는 설정, /demo/settings/api-keys (the real /settings/api-keys). Keys an agent uses to act as the
 * member: one row each with its prefix, when it was made and last used, and its menu (폐기 behind ConfirmDialog). 새 키
 * opens a short dialog for its name; the key itself is shown once, right after it is made, to copy.
 */
export function DemoApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(API_KEYS);
  const [isCreating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [made, setMade] = useState<string | undefined>();
  const [revoking, setRevoking] = useState<ApiKey | undefined>();
  const create = () => {
    if (!name.trim()) return;
    const prefix = `bit_${Math.random().toString(16).slice(2, 6)}`;
    setKeys([{ id: prefix, name: name.trim(), prefix, createdAt: new Date().toISOString() }, ...keys]);
    setMade(`${prefix}${Math.random().toString(36).slice(2, 14)}`);
    setName(''); setCreating(false);
  };
  return <PageFrame title="API 키" icon="key" width="narrow">
    <VStack gap={8}>
      <SettingsHead title="API 키" description="에이전트와 스크립트가 내 권한으로 BIT에 접근할 키를 관리합니다." />
      <SettingsCard title="내 키" id="api-keys" actions={<Button label="새 키" variant="secondary" size="sm" icon={<NavIcon name="plus" />} onClick={() => setCreating(true)} />}>
        {keys.length === 0 && <SettingsRow label="키가 없습니다" description="에이전트나 스크립트가 내 권한으로 일하게 하려면 키를 만드세요." />}
        {keys.map(key => <SettingsRow key={key.id} label={key.name}
          description={<><span className={demoStyles.key}>{key.prefix}…</span> · 만든 날 {dateText(key.createdAt)} · {key.lastUsedAt ? `마지막 사용 ${agoText(key.lastUsedAt)}` : '아직 쓰지 않음'}</>}>
          <MoreMenu label={`${key.name} 메뉴`} variant="ghost" size="sm" placement="end" items={[{ label: '폐기', icon: <NavIcon name="delete" />, onClick: () => setRevoking(key) }]} />
        </SettingsRow>)}
      </SettingsCard>
    </VStack>
    <CompactDialog isOpen={isCreating} title="새 API 키" subtitle="어디에 쓰는 키인지 알아볼 이름을 붙이세요." onClose={() => setCreating(false)} onSubmit={create}
      footer={<><Button label="취소" variant="ghost" onClick={() => setCreating(false)} /><Button type="submit" label="만들기" variant="primary" isDisabled={!name.trim()} /></>}>
      <TextInput label="이름" value={name} onChange={setName} hasAutoFocus placeholder="예: Claude Code (노트북)" />
    </CompactDialog>
    <CompactDialog isOpen={!!made} title="키를 복사하세요" subtitle="이 창을 닫으면 다시 볼 수 없습니다." onClose={() => setMade(undefined)}
      footer={<><Button label="복사" variant="secondary" icon={<NavIcon name="copy" />} onClick={() => void navigator.clipboard?.writeText(made ?? '')} /><Button label="닫기" variant="primary" onClick={() => setMade(undefined)} /></>}>
      <Text className={demoStyles.key}>{made}</Text>
    </CompactDialog>
    {revoking && <ConfirmDialog title="키를 폐기할까요?" description={`'${revoking.name}' 키를 쓰는 에이전트는 바로 로그인이 끊깁니다.`} confirmLabel="폐기" variant="destructive"
      onClose={() => setRevoking(undefined)} onConfirm={() => { setKeys(keys.filter(key => key.id !== revoking.id)); setRevoking(undefined); }} />}
  </PageFrame>;
}
