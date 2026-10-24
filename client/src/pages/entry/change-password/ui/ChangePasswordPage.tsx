import { Text } from '@astryxdesign/core';
import { AccountMenu } from './AccountMenu';
import { PasswordChangeForm } from '@/features/password-change';
import { AuthFrame } from '@/shared/ui';
export function ChangePasswordPage() {
  return <AuthFrame title="새 비밀번호를 설정해 주세요"><Text color="secondary">임시 비밀번호로 로그인했습니다. 계속하려면 본인만 아는 비밀번호로 바꿔 주세요.</Text><PasswordChangeForm /><AccountMenu recovery /></AuthFrame>;
}
