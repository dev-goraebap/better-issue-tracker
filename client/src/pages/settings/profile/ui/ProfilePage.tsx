import { VStack } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { sessionQueryOptions } from '@/shared/api';
import { DefaultAvatar, PageFrame, SettingsCard, SettingsHead, SettingsRow, StatusToken } from '@/shared/ui';

/**
 * PATTERN · 설정 카드, /settings/profile (account settings, outside any workspace). SettingsHead on top, then SettingsCard
 * sections of SettingsRow lines in the narrow column. The name and email are read here; changing them waits for the
 * server (T-006 leaves profile editing out), and the row says so.
 */
export function ProfilePage() {
  const me = useQuery(sessionQueryOptions).data?.user;
  return <PageFrame title="프로필" icon="person" width="narrow">
    <VStack gap={8}>
      <SettingsHead title="프로필" description="팀원과 에이전트 기록에 내가 어떻게 보이는지 확인합니다." />
      <SettingsCard title="세부 정보" id="profile-details">
        <SettingsRow lead={<DefaultAvatar seed={me?.id ?? ''} name={me?.name ?? ''} size={40} />} label="이름" description="팀원과 에이전트 기록에 이 이름으로 보입니다. 바꾸려면 관리자에게 요청하세요.">
          {me?.name}{me?.instanceAdmin && <> <StatusToken label="인스턴스 관리자" color="blue" /></>}
        </SettingsRow>
        <SettingsRow label="이메일" description="이 주소로 로그인합니다.">{me?.email}</SettingsRow>
      </SettingsCard>
    </VStack>
  </PageFrame>;
}
