import { useState } from 'react';
import { Button, VStack } from '@astryxdesign/core';
import { CompactDialog, NavIcon, PageFrame, SettingsCard, SettingsRow, StatusToken } from '@/shared/ui';
import { agoText, LOGIN_SESSIONS, type LoginSession } from '@/entities/demo-sample';

/**
 * PATTERN · 보안 설정, /demo/settings/security (the real /settings/security). The password changes in a short dialog
 * (the real one asks for the current password, D-027); below, every device signed in, this one marked, each with 로그아웃
 * and one action for all the others.
 */
export function DemoSecurityPage() {
  const [sessions, setSessions] = useState<LoginSession[]>(LOGIN_SESSIONS);
  const [isChanging, setChanging] = useState(false);
  return <PageFrame title="시큐리티" icon="lock" width="narrow">
    <VStack gap={8}>
      <SettingsCard title="로그인" id="security-login">
        <SettingsRow label="비밀번호" description="마지막 변경 32일 전. 바꾸면 다른 기기는 모두 로그아웃됩니다.">
          <Button label="비밀번호 변경" variant="secondary" size="sm" onClick={() => setChanging(true)} />
        </SettingsRow>
      </SettingsCard>
      <SettingsCard title="로그인된 기기" id="security-sessions"
        actions={sessions.length > 1 ? <Button label="다른 기기 모두 로그아웃" variant="ghost" size="sm" onClick={() => setSessions(sessions.filter(session => session.isCurrent))} /> : undefined}>
        {sessions.map(session => <SettingsRow key={session.id} lead={<NavIcon name={session.device.includes('iPhone') ? 'person' : 'grid'} />}
          label={<>{session.device}{session.isCurrent && <> <StatusToken label="지금 이 기기" color="green" /></>}</>}
          description={`${session.place} · ${session.isCurrent ? '사용 중' : `마지막 접속 ${agoText(session.lastSeenAt)}`}`}>
          {!session.isCurrent && <Button label="로그아웃" variant="ghost" size="sm" onClick={() => setSessions(sessions.filter(each => each.id !== session.id))} />}
        </SettingsRow>)}
      </SettingsCard>
    </VStack>
    <CompactDialog isOpen={isChanging} title="비밀번호 변경" subtitle="데모에서는 바꾸지 않습니다." onClose={() => setChanging(false)}
      footer={<Button label="닫기" variant="primary" onClick={() => setChanging(false)} />}>
      실제 화면은 지금 비밀번호와 새 비밀번호 두 번을 받습니다.
    </CompactDialog>
  </PageFrame>;
}
