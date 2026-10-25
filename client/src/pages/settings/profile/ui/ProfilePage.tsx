import { useState } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError, renameMe, sessionQueryOptions } from '@/shared/api';
import { DefaultAvatar, FormMessage, PageFrame, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';

/**
 * PATTERN · 설정 카드, /settings/profile (account settings, outside any workspace). SettingsHead on top, then SettingsCard
 * sections of SettingsRow lines in the narrow column. The member changes their own name here (saved with the card's
 * 저장; every workspace's member lists and records show it from then); the email is read only.
 */
export function ProfilePage() {
  const client = useQueryClient();
  const me = useQuery(sessionQueryOptions).data?.user;
  const [typed, setTyped] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const name = typed ?? me?.name ?? '';
  const isChanged = !!me && name.trim() !== me.name;
  const save = async () => {
    if (!name.trim()) { setError('이름을 입력해 주세요.'); return; }
    if (!isChanged || isBusy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await renameMe(name.trim());
      await client.invalidateQueries({ queryKey: sessionQueryOptions.queryKey });
      // Every workspace's lists carry the name (members, assignees), so they read it again.
      await client.invalidateQueries({ queryKey: ['workspace'] });
      setTyped(null); setNotice('저장했습니다.');
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <PageFrame title="프로필" icon="person" width="narrow">
    <VStack gap={8}>
      <SettingsHead title="프로필" description="팀원과 에이전트 기록에 내가 어떻게 보이는지 정합니다." />
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <SettingsCard title="세부 정보" id="profile-details" actions={<Button type="submit" label="저장" variant="secondary" size="sm" isDisabled={!isChanged} isLoading={isBusy} />}>
          <SettingsRow lead={<DefaultAvatar seed={me?.id ?? ''} name={me?.name ?? ''} size={40} />} label="이름" description="팀원과 에이전트 기록에 이 이름으로 보입니다.">
            <TextInput label="이름" isLabelHidden size="sm" value={name} onChange={setTyped} isRequired isDisabled={isBusy || !me} />
          </SettingsRow>
          <SettingsRow label="이메일" description="이 주소로 로그인합니다. 바꾸려면 인스턴스 관리자에게 요청하세요.">
            {me?.email}{me?.instanceAdmin && <> <StatusToken label="인스턴스 관리자" color="blue" /></>}
          </SettingsRow>
        </SettingsCard>
      </form>
      <FormMessage message={error} /><FormMessage message={notice} isError={false} />
    </VStack>
  </PageFrame>;
}
