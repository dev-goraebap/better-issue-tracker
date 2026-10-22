import { Text } from '@astryxdesign/core';
import { PasswordChangeForm } from '@/features/password-change';
import { AuthFrame } from '@/shared/ui';

export function SecurityPage() {
  return <AuthFrame title="비밀번호 변경"><Text color="secondary">변경하면 다른 기기의 로그인과 모든 API 키가 해제됩니다. 이 기기는 새 세션으로 로그인 상태를 유지합니다.</Text><PasswordChangeForm /></AuthFrame>;
}
