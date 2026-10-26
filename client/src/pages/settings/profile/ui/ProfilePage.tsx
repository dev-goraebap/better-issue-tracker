import { useState } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError, capabilitiesQueryOptions, changeAvatar, removeAvatar, renameMe, sessionQueryOptions } from '@/shared/api';
import { rememberPictures } from '@/shared/lib/person-pictures';
import { DefaultAvatar, FormMessage, PageFrame, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';
import { PictureDialog } from '@/features/picture-change';

/**
 * PATTERN · 설정 카드, /settings/profile (account settings, outside any workspace). SettingsHead on top, then SettingsCard
 * sections of SettingsRow lines in the narrow column. The member changes their own name here (saved with the card's
 * 저장; every workspace's member lists and records show it from then) and their picture (BIT-30, in a short dialog that
 * crops it, only while the server keeps files); the email is read only.
 */
export function ProfilePage() {
  const client = useQueryClient();
  const me = useQuery(sessionQueryOptions).data?.user;
  const [typed, setTyped] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isPicturing, setPicturing] = useState(false);
  const canPicture = !!useQuery(capabilitiesQueryOptions).data?.objectStorage;
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
  // A new or removed picture reaches the session at once and every workspace's members when read again.
  const pictured = async (change: Promise<unknown>, done: string) => {
    await change;
    const session = await client.fetchQuery({ ...sessionQueryOptions, staleTime: 0 });
    if (session) rememberPictures([[session.user.id, session.user.avatar]]);
    await client.invalidateQueries({ queryKey: ['workspace'] });
    setError(''); setNotice(done);
  };
  return <PageFrame title="프로필" icon="person" width="narrow">
    <VStack gap={8}>
      <SettingsHead title="프로필" description="팀원과 에이전트 기록에 내가 어떻게 보이는지 정합니다." />
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <SettingsCard title="세부 정보" id="profile-details" actions={<Button type="submit" label="저장" variant="secondary" size="sm" isDisabled={!isChanged} isLoading={isBusy} />}>
          <SettingsRow lead={<DefaultAvatar seed={me?.id ?? ''} name={me?.name ?? ''} size={40} />} label="이름" description="팀원과 에이전트 기록에 이 이름으로 보입니다.">
            <TextInput label="이름" isLabelHidden size="sm" value={name} onChange={setTyped} isRequired isDisabled={isBusy || !me} />
          </SettingsRow>
          {canPicture && <SettingsRow label="사진" description="이름 옆에 보입니다. 없으면 그림으로 보입니다.">
            <Button label={me?.avatar ? '사진 바꾸기' : '사진 올리기'} variant="secondary" size="sm" isDisabled={!me} onClick={() => setPicturing(true)} />
          </SettingsRow>}
          <SettingsRow label="이메일" description="이 주소로 로그인합니다. 바꾸려면 인스턴스 관리자에게 요청하세요.">
            {me?.email}{me?.instanceAdmin && <> <StatusToken label="인스턴스 관리자" color="blue" /></>}
          </SettingsRow>
        </SettingsCard>
      </form>
      <FormMessage message={error} /><FormMessage message={notice} isError={false} />
    </VStack>
    {isPicturing && me && <PictureDialog title="내 사진" shape="round" filename="avatar.jpg" hasPicture={!!me.avatar}
      preview={<DefaultAvatar seed={me.id} name={me.name} size={64} />} onClose={() => setPicturing(false)}
      onSave={uploadId => pictured(changeAvatar(uploadId), '사진을 바꿨습니다.')} onRemove={() => pictured(removeAvatar(), '사진을 뺐습니다.')} />}
  </PageFrame>;
}
