import { useState } from 'react';
import { Switch, VStack } from '@astryxdesign/core';
import { PageFrame, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';

const KINDS = [
  { key: 'mention', label: '언급', description: '댓글이나 세션 요약에서 나를 부를 때' },
  { key: 'assigned', label: '배정', description: '작업이 나에게 배정될 때' },
  { key: 'review', label: '검토 요청', description: '누군가 내 검토를 요청할 때' },
  { key: 'decision', label: '결정 변경', description: '내가 관여한 결정이 확정·대체될 때' },
] as const;

/**
 * PATTERN · 스위치 설정, /demo/settings/notifications. Which notices reach the bell and which also go by mail: one row
 * per kind with its switch, applied at once. A channel that needs a feature the server has off (mail) says so in its
 * row and stays off.
 */
export function DemoNotificationsPage() {
  const [on, setOn] = useState<Record<string, boolean>>({ mention: true, assigned: true, review: true, decision: false });
  return <PageFrame title="알림" icon="bell" width="narrow">
    <VStack gap={8}>
      <SettingsHead title="알림" description="어떤 일이 생기면 알릴지, 어디로 받을지 고릅니다." />
      <SettingsCard title="알림 종류" id="notify-kinds">
        {KINDS.map(kind => <SettingsRow key={kind.key} label={kind.label} description={kind.description}>
          <Switch label={kind.label} isLabelHidden value={on[kind.key]} onChange={value => setOn({ ...on, [kind.key]: value })} />
        </SettingsRow>)}
      </SettingsCard>
      <SettingsCard title="받는 곳" id="notify-channels">
        <SettingsRow label="앱 안 알림" description="메뉴 머리의 종에 모입니다. 끌 수 없습니다."><Switch label="앱 안 알림" isLabelHidden value isDisabled onChange={() => undefined} /></SettingsRow>
        <SettingsRow label="메일" description="메일 기능이 꺼진 서버라 보낼 수 없습니다."><Switch label="메일" isLabelHidden value={false} isDisabled onChange={() => undefined} /></SettingsRow>
      </SettingsCard>
    </VStack>
  </PageFrame>;
}
