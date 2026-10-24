import { useState } from 'react';
import { Button, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError, logout } from '@/shared/api';
import { CompactDialog, ConfirmDialog, PageFrame, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { PasswordChangeForm } from '@/features/password-change';

/**
 * PATTERN · 보안 설정, /settings/security. The password changes in a short dialog that asks the current one (D-027);
 * changing it signs out every other device and ends every API key, and this device signs in again. 모든 기기에서
 * 로그아웃 ends every session, this one too, behind ConfirmDialog.
 */
export function SecurityPage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [isChanging, setChanging] = useState(false);
  const [isLeaving, setLeaving] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const signOutAll = async () => {
    if (isBusy) return;
    setBusy(true); setError(null);
    try { await logout(true); await client.cancelQueries(); client.clear(); await navigate({ to: '/login' }); }
    catch (failure) { setError(new Error(authError(failure))); }
    finally { setBusy(false); }
  };
  return <PageFrame title="시큐리티" icon="lock" width="narrow">
    <VStack gap={8}>
      <SettingsHead title="시큐리티" description="비밀번호와 로그인된 기기를 관리합니다." />
      <SettingsCard title="로그인" id="security-login">
        <SettingsRow label="비밀번호" description="바꾸면 다른 기기의 로그인과 모든 API 키가 해제됩니다.">
          <Button label="비밀번호 변경" variant="secondary" size="sm" onClick={() => setChanging(true)} />
        </SettingsRow>
      </SettingsCard>
      <SettingsCard title="로그인된 기기" id="security-sessions">
        <SettingsRow label="모든 기기에서 로그아웃" description="이 기기를 포함해 로그인된 모든 곳에서 나갑니다.">
          <Button label="모두 로그아웃" variant="ghost" size="sm" onClick={() => setLeaving(true)} />
        </SettingsRow>
      </SettingsCard>
    </VStack>
    <CompactDialog isOpen={isChanging} title="비밀번호 변경" width={460} onClose={() => setChanging(false)} footer={null}>
      <PasswordChangeForm />
    </CompactDialog>
    {isLeaving && <ConfirmDialog title="모든 기기에서 로그아웃할까요?" description="이 기기도 로그아웃되어 다시 로그인해야 합니다." confirmLabel="모두 로그아웃" variant="destructive"
      isPending={isBusy} error={error} onClose={() => { setLeaving(false); setError(null); }} onConfirm={() => { void signOutAll(); }} />}
  </PageFrame>;
}
